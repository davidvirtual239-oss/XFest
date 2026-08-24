-- ============================================================
-- XFest — asistencias + valoraciones (evento y organizador)
-- ============================================================
-- Script IDEMPOTENTE, igual que el resto: el editor SQL de Supabase
-- no revierte si una sentencia falla.
-- ============================================================

do $do$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'estado_asistencia' and n.nspname = 'public') then
    create type public.estado_asistencia as enum ('guardado', 'confirmado');
  end if;
end
$do$;

-- ------------------------------------------------------------
-- Asistencias: 'guardado' = me interesa, 'confirmado' = voy a ir
-- ------------------------------------------------------------
create table if not exists public.asistencias (
  user_id        uuid not null references auth.users(id) on delete cascade,
  evento_id      uuid not null references public.eventos(id) on delete cascade,
  estado         public.estado_asistencia not null default 'guardado',
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  primary key (user_id, evento_id)
);

create index if not exists asistencias_evento_idx on public.asistencias (evento_id, estado);
create index if not exists asistencias_user_idx   on public.asistencias (user_id, estado);

-- ------------------------------------------------------------
-- Valoraciones: una fila por (autor, evento) con DOS notas.
-- Una sola tabla y un solo formulario: separar en dos tablas
-- duplicaba las reglas de elegibilidad y sumaba friccion al valorar.
-- ------------------------------------------------------------
create table if not exists public.valoraciones (
  id              uuid primary key default gen_random_uuid(),
  autor_id        uuid not null references auth.users(id) on delete cascade,
  evento_id       uuid not null references public.eventos(id) on delete cascade,
  -- Copia del dueno del evento: evita un join en cada agregado de
  -- reputacion. Lo escribe un trigger, nunca el cliente.
  organizador_id  uuid not null references auth.users(id) on delete cascade,
  estrellas_evento      smallint not null check (estrellas_evento between 1 and 5),
  estrellas_organizador smallint not null check (estrellas_organizador between 1 and 5),
  comentario      text check (comentario is null or char_length(comentario) <= 500),
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),
  unique (autor_id, evento_id)
);

create index if not exists valoraciones_evento_idx      on public.valoraciones (evento_id);
create index if not exists valoraciones_organizador_idx on public.valoraciones (organizador_id);

-- ============================================================
-- Elegibilidad para valorar
-- ============================================================
-- Reglas: el evento ya termino, el usuario confirmo asistencia, y no
-- es el propio organizador (nadie se autocalifica).
create or replace function public.puede_valorar(p_evento_id uuid)
returns boolean
language sql stable security definer set search_path = public as $fn$
  select exists (
    select 1
    from public.eventos e
    join public.asistencias a
      on a.evento_id = e.id
     and a.user_id = auth.uid()
     and a.estado = 'confirmado'
    where e.id = p_evento_id
      and e.owner_id <> auth.uid()
      and (e.fecha + e.hora_termino) < now()
  );
$fn$;

revoke all on function public.puede_valorar(uuid) from public;
grant execute on function public.puede_valorar(uuid) to authenticated;

-- El organizador_id de la valoracion siempre lo pone el servidor,
-- nunca el cliente: se copia del evento.
create or replace function public.fijar_organizador_valoracion()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  select owner_id into new.organizador_id from public.eventos where id = new.evento_id;
  new.actualizado_en := now();
  return new;
end
$fn$;

drop trigger if exists trg_fijar_organizador on public.valoraciones;
create trigger trg_fijar_organizador
  before insert or update on public.valoraciones
  for each row execute function public.fijar_organizador_valoracion();

-- Mantener actualizado_en en asistencias
create or replace function public.tocar_asistencia()
returns trigger language plpgsql set search_path = public as $fn$
begin
  new.actualizado_en := now();
  return new;
end
$fn$;

drop trigger if exists trg_tocar_asistencia on public.asistencias;
create trigger trg_tocar_asistencia
  before update on public.asistencias
  for each row execute function public.tocar_asistencia();

-- ============================================================
-- RLS
-- ============================================================
alter table public.asistencias  enable row level security;
alter table public.valoraciones enable row level security;

-- --- asistencias: privadas. Nadie ve a que fiestas va otro. ---
drop policy if exists "asistencia propia: leer" on public.asistencias;
create policy "asistencia propia: leer" on public.asistencias for select
  to authenticated using (user_id = auth.uid());

drop policy if exists "asistencia propia: crear" on public.asistencias;
create policy "asistencia propia: crear" on public.asistencias for insert
  to authenticated with check (user_id = auth.uid());

drop policy if exists "asistencia propia: actualizar" on public.asistencias;
create policy "asistencia propia: actualizar" on public.asistencias for update
  to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "asistencia propia: borrar" on public.asistencias;
create policy "asistencia propia: borrar" on public.asistencias for delete
  to authenticated using (user_id = auth.uid());

-- --- valoraciones: lectura publica (son reputacion), escritura acotada ---
drop policy if exists "valoraciones: lectura publica" on public.valoraciones;
create policy "valoraciones: lectura publica" on public.valoraciones for select
  to anon, authenticated using (true);

drop policy if exists "valoracion propia: crear" on public.valoraciones;
create policy "valoracion propia: crear" on public.valoraciones for insert
  to authenticated
  with check (autor_id = auth.uid() and public.puede_valorar(evento_id));

drop policy if exists "valoracion propia: editar" on public.valoraciones;
create policy "valoracion propia: editar" on public.valoraciones for update
  to authenticated using (autor_id = auth.uid()) with check (autor_id = auth.uid());

drop policy if exists "valoracion propia: borrar" on public.valoraciones;
create policy "valoracion propia: borrar" on public.valoraciones for delete
  to authenticated using (autor_id = auth.uid());

-- ============================================================
-- Agregados
-- ============================================================
-- Conteo de asistentes: las asistencias son privadas, pero el NUMERO
-- es publico. Esta vista se crea SIN security_invoker a proposito: se
-- ejecuta con los permisos del dueno y por lo tanto pasa por encima de
-- la RLS de asistencias, exponiendo solo el agregado, nunca quien va.
drop view if exists public.eventos_asistentes;
create view public.eventos_asistentes as
select evento_id,
       count(*) filter (where estado = 'confirmado')::int as confirmados,
       count(*) filter (where estado = 'guardado')::int   as guardados
from public.asistencias
group by evento_id;

grant select on public.eventos_asistentes to anon, authenticated;

-- Reputacion por evento
drop view if exists public.eventos_reputacion;
create view public.eventos_reputacion
with (security_invoker = true) as
select evento_id,
       round(avg(estrellas_evento)::numeric, 2)::float8 as promedio,
       count(*)::int as total
from public.valoraciones
group by evento_id;

grant select on public.eventos_reputacion to anon, authenticated;

-- Reputacion por organizador (el "rating tipo Uber" de la persona)
drop view if exists public.organizadores_reputacion;
create view public.organizadores_reputacion
with (security_invoker = true) as
select organizador_id,
       round(avg(estrellas_organizador)::numeric, 2)::float8 as promedio,
       count(*)::int as total
from public.valoraciones
group by organizador_id;

grant select on public.organizadores_reputacion to anon, authenticated;
