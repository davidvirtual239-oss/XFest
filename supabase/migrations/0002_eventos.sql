-- ============================================================
-- EVENTOS creados por usuarios (publicacion inmediata, sin moderacion)
-- ============================================================

create table public.eventos (
  id            uuid primary key default gen_random_uuid(),
  -- auth.users y no perfiles: no hay trigger que cree el perfil al registrarse
  owner_id      uuid not null references auth.users(id) on delete cascade,
  nombre        text not null check (char_length(nombre) between 3 and 100),
  descripcion   text,
  fecha         date not null,
  hora_inicio   time not null,
  hora_termino  time not null,
  lat           double precision not null check (lat between -90 and 90),
  lng           double precision not null check (lng between -180 and 180),
  ubicacion     geography(Point, 4326) not null,
  direccion     text,
  portada_url   text not null,
  capacidad     integer check (capacidad is null or capacidad > 0),  -- null = sin limite
  precio_clp    integer not null check (precio_clp >= 0),
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint eventos_horario_valido check (hora_termino > hora_inicio)
);

create index eventos_ubicacion_gix on public.eventos using gist (ubicacion);
create index eventos_fecha_idx on public.eventos (fecha, hora_inicio);

-- ============================================================
-- RLS
-- ============================================================
alter table public.eventos enable row level security;

create policy "eventos: lectura publica" on public.eventos for select
  to anon, authenticated using (true);

create policy "evento propio: crear" on public.eventos for insert
  to authenticated with check (owner_id = auth.uid());

create policy "evento propio: actualizar" on public.eventos for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "evento propio: borrar" on public.eventos for delete
  to authenticated using (owner_id = auth.uid() or public.es_admin());

-- El dueno no puede transferir la ficha a otro usuario
create or replace function public.proteger_evento()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  new.owner_id := old.owner_id;
  new.actualizado_en := now();
  return new;
end
$fn$;

create trigger trg_proteger_evento
  before update on public.eventos
  for each row execute function public.proteger_evento();
