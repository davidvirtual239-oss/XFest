-- ============================================================
-- INSCRIPCIONES a eventos + notificaciones al dueno del evento
-- ============================================================
-- Script IDEMPOTENTE: se puede re-ejecutar completo sin errores.
--
-- Reglas del modelo:
--  * Se puede inscribir gente sin cuenta (usuario_id null): el formulario
--    pide nombre/email/telefono/rut igual, para poder controlar el acceso.
--  * El cupo se toma al inscribirse, aunque el pago siga 'pendiente'.
--    Una inscripcion 'cancelada' libera el cupo y permite reintentar.
--  * El alta NO pasa por RLS sino por inscribir_en_evento(): el chequeo de
--    capacidad y el insert tienen que ser una sola operacion atomica.
-- ============================================================

do $do$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'estado_inscripcion' and n.nspname = 'public') then
    create type public.estado_inscripcion as enum ('pendiente','confirmada','cancelada');
  end if;
end
$do$;

-- Las ordenes nacieron atadas a proveedores; ahora tambien pagan eventos.
alter table public.ordenes
  add column if not exists evento_id uuid references public.eventos(id) on delete set null;

create table if not exists public.inscripciones (
  id          uuid primary key default gen_random_uuid(),
  evento_id   uuid not null references public.eventos(id) on delete cascade,
  -- null = se inscribio sin cuenta. on delete set null: borrar la cuenta no
  -- puede borrar al asistente de la lista del organizador.
  usuario_id  uuid references auth.users(id) on delete set null,
  nombre      text not null check (char_length(nombre) between 2 and 80),
  email       text not null check (position('@' in email) > 1),
  telefono    text not null,                       -- normalizado: +569XXXXXXXX
  rut         text not null,                       -- normalizado: 12345678-5
  estado      public.estado_inscripcion not null default 'confirmada',
  monto_clp   integer not null default 0 check (monto_clp >= 0),
  orden_id    uuid references public.ordenes(id) on delete set null,
  creado_en   timestamptz not null default now()
);

-- Un mismo rut no toma dos cupos del mismo evento; si se cancela, puede volver.
create unique index if not exists inscripciones_evento_rut_uidx
  on public.inscripciones (evento_id, rut) where estado <> 'cancelada';
create index if not exists inscripciones_evento_idx
  on public.inscripciones (evento_id, creado_en desc);
create index if not exists inscripciones_usuario_idx
  on public.inscripciones (usuario_id);
create index if not exists inscripciones_orden_idx
  on public.inscripciones (orden_id);

-- ------------------------------------------------------------
-- Notificaciones (por ahora solo "alguien se inscribio en tu evento")
-- ------------------------------------------------------------
create table if not exists public.notificaciones (
  id             uuid primary key default gen_random_uuid(),
  usuario_id     uuid not null references auth.users(id) on delete cascade,  -- destinatario
  evento_id      uuid references public.eventos(id) on delete cascade,
  inscripcion_id uuid references public.inscripciones(id) on delete cascade,
  tipo           text not null default 'inscripcion',
  titulo         text not null,
  detalle        text,
  leida_en       timestamptz,
  creado_en      timestamptz not null default now()
);

create index if not exists notificaciones_usuario_idx
  on public.notificaciones (usuario_id, creado_en desc);
create index if not exists notificaciones_sin_leer_idx
  on public.notificaciones (usuario_id) where leida_en is null;

-- ============================================================
-- RLS
-- ============================================================
alter table public.inscripciones  enable row level security;
alter table public.notificaciones enable row level security;

-- --- inscripciones ---
-- Leen: el organizador (su lista de asistentes), el propio inscrito y el admin.
drop policy if exists "inscripciones: leer" on public.inscripciones;
create policy "inscripciones: leer" on public.inscripciones for select
  to authenticated
  using (
    usuario_id = auth.uid()
    or public.es_admin()
    or exists (select 1 from public.eventos e
               where e.id = inscripciones.evento_id and e.owner_id = auth.uid())
  );

-- El organizador puede dar de baja a alguien de su evento.
drop policy if exists "inscripciones: cancelar" on public.inscripciones;
create policy "inscripciones: cancelar" on public.inscripciones for update
  to authenticated
  using (
    usuario_id = auth.uid()
    or public.es_admin()
    or exists (select 1 from public.eventos e
               where e.id = inscripciones.evento_id and e.owner_id = auth.uid())
  )
  with check (estado = 'cancelada');
-- INSERT: sin policy a proposito. El alta entra por inscribir_en_evento().

-- --- notificaciones ---
drop policy if exists "notificaciones propias: leer" on public.notificaciones;
create policy "notificaciones propias: leer" on public.notificaciones for select
  to authenticated using (usuario_id = auth.uid());

-- Solo para marcarlas leidas; el resto de las columnas las fija el trigger.
drop policy if exists "notificaciones propias: marcar leidas" on public.notificaciones;
create policy "notificaciones propias: marcar leidas" on public.notificaciones for update
  to authenticated using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

-- ============================================================
-- Alta de inscripcion: capacidad + insert en una sola transaccion
-- ============================================================
create or replace function public.inscribir_en_evento(
  p_evento_id uuid,
  p_nombre    text,
  p_email     text,
  p_telefono  text,
  p_rut       text
)
returns table (id uuid, estado public.estado_inscripcion, monto_clp integer)
language plpgsql security definer set search_path = public as $fn$
declare
  v_evento    record;
  v_ocupados  integer;
  v_estado    public.estado_inscripcion;
  v_id        uuid;
begin
  -- FOR UPDATE serializa a los que intentan tomar el ultimo cupo del evento.
  select e.id, e.capacidad, e.precio_clp, e.fecha
    into v_evento
    from public.eventos e
   where e.id = p_evento_id
     for update;

  if not found then
    raise exception 'EVENTO_NO_EXISTE';
  end if;

  if v_evento.fecha < current_date then
    raise exception 'EVENTO_TERMINADO';
  end if;

  if v_evento.capacidad is not null then
    select count(*) into v_ocupados
      from public.inscripciones i
     where i.evento_id = p_evento_id and i.estado <> 'cancelada';

    if v_ocupados >= v_evento.capacidad then
      raise exception 'SIN_CUPOS';
    end if;
  end if;

  -- Gratis => queda confirmada de una. Con precio => espera al webhook de Flow.
  v_estado := case when v_evento.precio_clp > 0 then 'pendiente' else 'confirmada' end;

  begin
    insert into public.inscripciones
      (evento_id, usuario_id, nombre, email, telefono, rut, estado, monto_clp)
    values
      (p_evento_id, auth.uid(), p_nombre, p_email, p_telefono, p_rut,
       v_estado, v_evento.precio_clp)
    returning inscripciones.id into v_id;
  exception when unique_violation then
    raise exception 'YA_INSCRITO';
  end;

  return query select v_id, v_estado, v_evento.precio_clp;
end
$fn$;

revoke all on function public.inscribir_en_evento(uuid, text, text, text, text) from public;
grant execute on function public.inscribir_en_evento(uuid, text, text, text, text)
  to anon, authenticated;

-- ------------------------------------------------------------
-- Cupos tomados: publico, sin exponer la lista de asistentes.
-- ------------------------------------------------------------
create or replace function public.evento_inscritos(p_evento_id uuid)
returns integer
language sql stable security definer set search_path = public as $fn$
  select count(*)::integer
    from public.inscripciones
   where evento_id = p_evento_id and estado <> 'cancelada';
$fn$;

revoke all on function public.evento_inscritos(uuid) from public;
grant execute on function public.evento_inscritos(uuid) to anon, authenticated;

-- ============================================================
-- Aviso al organizador
-- ============================================================
-- Se dispara cuando la inscripcion queda confirmada: al insertarla si el
-- evento es gratis, o al confirmarla el webhook de Flow si era pagada.
create or replace function public.notificar_inscripcion()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare
  v_evento record;
begin
  if new.estado <> 'confirmada' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.estado = 'confirmada' then
    return new;   -- ya se aviso
  end if;

  select e.owner_id, e.nombre into v_evento
    from public.eventos e where e.id = new.evento_id;

  if not found then
    return new;
  end if;

  insert into public.notificaciones
    (usuario_id, evento_id, inscripcion_id, tipo, titulo, detalle)
  values (
    v_evento.owner_id,
    new.evento_id,
    new.id,
    'inscripcion',
    new.nombre || ' se inscribio en tu evento',
    v_evento.nombre
  );

  return new;
end
$fn$;

drop trigger if exists trg_notificar_inscripcion on public.inscripciones;
create trigger trg_notificar_inscripcion
  after insert or update of estado on public.inscripciones
  for each row execute function public.notificar_inscripcion();
