-- ============================================================
-- FIESTA MAESTRA — esquema base + PostGIS + RLS
-- ============================================================
create extension if not exists postgis;
create extension if not exists pg_trgm;
create extension if not exists unaccent;

create type public.categoria_evento as enum
  ('infantiles','corporativos','bodas','graduaciones');

create type public.estado_proveedor as enum
  ('borrador','pendiente','aprobado','suspendido');

-- ------------------------------------------------------------
-- Perfiles (1:1 con auth.users)
-- ------------------------------------------------------------
create table public.perfiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nombre      text not null check (char_length(nombre) between 2 and 80),
  telefono    text,
  es_admin    boolean not null default false,
  creado_en   timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Proveedores
-- ------------------------------------------------------------
create table public.proveedores (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  nombre        text not null,
  slug          text not null unique,
  descripcion   text,
  categorias    public.categoria_evento[] not null default '{}',
  comuna        text,
  region        text,
  -- Punto geografico (WGS84). geography => distancias en metros, sin proyectar.
  ubicacion     geography(Point, 4326),
  precio_desde  integer check (precio_desde >= 0),   -- CLP
  portada_url   text,
  estado        public.estado_proveedor not null default 'borrador',
  -- Datos sensibles: NUNCA se exponen en el listado publico (ver vista abajo)
  email_contacto    text,
  telefono_contacto text,
  rut               text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index proveedores_ubicacion_gix on public.proveedores using gist (ubicacion);
create index proveedores_categorias_gin on public.proveedores using gin (categorias);
create index proveedores_busqueda_trgm on public.proveedores
  using gin ((unaccent(nombre) || ' ' || coalesce(unaccent(descripcion),'')) gin_trgm_ops);
create index proveedores_estado_idx on public.proveedores (estado) where estado = 'aprobado';

-- ------------------------------------------------------------
-- Ordenes / pagos (Flow)
-- ------------------------------------------------------------
create table public.ordenes (
  id             uuid primary key default gen_random_uuid(),
  comprador_id   uuid references auth.users(id) on delete set null,
  proveedor_id   uuid references public.proveedores(id) on delete set null,
  monto_clp      integer not null check (monto_clp > 0),
  estado         text not null default 'pendiente'
                 check (estado in ('pendiente','pagada','rechazada','anulada')),
  commerce_order text not null unique,          -- idempotencia lado nuestro
  flow_order     bigint unique,                 -- idempotencia lado Flow
  email          text not null,
  pagado_en      timestamptz,
  creado_en      timestamptz not null default now()
);

-- Log de webhooks: la PK sobre el token da idempotencia gratis
create table public.flow_eventos (
  token        text primary key,
  payload      jsonb not null,
  procesado_en timestamptz not null default now()
);

-- ============================================================
-- RLS
-- ============================================================
alter table public.perfiles      enable row level security;
alter table public.proveedores   enable row level security;
alter table public.ordenes       enable row level security;
alter table public.flow_eventos  enable row level security;   -- sin policies => solo service_role

-- Helper SECURITY DEFINER: evita recursion infinita de policies al leer perfiles
create or replace function public.es_admin()
returns boolean language sql stable security definer set search_path = public as $fn$
  select coalesce((select es_admin from public.perfiles where id = auth.uid()), false);
$fn$;

-- --- perfiles ---
create policy "perfil propio: leer" on public.perfiles for select
  to authenticated using (id = auth.uid() or public.es_admin());

create policy "perfil propio: editar" on public.perfiles for update
  to authenticated using (id = auth.uid())
  with check (id = auth.uid() and es_admin = false);

-- --- proveedores ---
-- Lectura publica SOLO de aprobados (anon + authenticated)
create policy "proveedores aprobados: publico" on public.proveedores for select
  to anon, authenticated
  using (estado = 'aprobado');

-- El dueno ve los suyos en cualquier estado
create policy "proveedor propio: leer" on public.proveedores for select
  to authenticated using (owner_id = auth.uid() or public.es_admin());

create policy "proveedor propio: crear" on public.proveedores for insert
  to authenticated
  with check (owner_id = auth.uid() and estado = 'borrador');  -- no se auto-aprueba

create policy "proveedor propio: actualizar" on public.proveedores for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "proveedor propio: borrar" on public.proveedores for delete
  to authenticated using (owner_id = auth.uid() or public.es_admin());

-- Blindaje extra: el dueno no puede escalar su propio 'estado' a 'aprobado'
create or replace function public.proteger_estado_proveedor()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if new.estado is distinct from old.estado and not public.es_admin() then
    new.estado := old.estado;
  end if;
  new.owner_id := old.owner_id;          -- tampoco puede transferir la ficha
  new.actualizado_en := now();
  return new;
end
$fn$;

create trigger trg_proteger_estado
  before update on public.proveedores
  for each row execute function public.proteger_estado_proveedor();

-- --- ordenes ---
create policy "orden propia: leer" on public.ordenes for select
  to authenticated
  using (comprador_id = auth.uid()
         or public.es_admin()
         or exists (select 1 from public.proveedores p
                    where p.id = ordenes.proveedor_id and p.owner_id = auth.uid()));
-- INSERT/UPDATE de ordenes: sin policy => solo service_role (Server Action / webhook).

-- ============================================================
-- Vista publica: expone SOLO columnas seguras (sin rut/email/telefono)
-- ============================================================
create view public.proveedores_publicos
with (security_invoker = true) as
select id, nombre, slug, descripcion, categorias, comuna, region,
       precio_desde, portada_url, ubicacion
from public.proveedores
where estado = 'aprobado';

grant select on public.proveedores_publicos to anon, authenticated;

-- ============================================================
-- RPC de busqueda: texto + categoria + radio km (PostGIS)
-- ============================================================
create or replace function public.buscar_proveedores(
  p_query     text default null,
  p_categoria public.categoria_evento default null,
  p_lat       double precision default null,
  p_lng       double precision default null,
  p_radio_m   integer default 25000,
  p_limit     integer default 12,
  p_offset    integer default 0
)
returns table (
  id uuid, nombre text, slug text, descripcion text, comuna text,
  precio_desde integer, portada_url text, distancia_km double precision
)
language sql stable security invoker set search_path = public as $fn$
  with punto as (
    select case when p_lat is null or p_lng is null then null
                else st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography end as g
  )
  select p.id, p.nombre, p.slug, p.descripcion, p.comuna,
         p.precio_desde, p.portada_url,
         case when punto.g is null then null
              else round((st_distance(p.ubicacion, punto.g) / 1000)::numeric, 1)::double precision
         end as distancia_km
  from public.proveedores_publicos p, punto
  where (p_categoria is null or p_categoria = any(p.categorias))
    and (p_query is null or p_query = '' or
         unaccent(p.nombre) ilike '%' || unaccent(p_query) || '%' or
         unaccent(coalesce(p.descripcion,'')) ilike '%' || unaccent(p_query) || '%')
    and (punto.g is null or st_dwithin(p.ubicacion, punto.g, p_radio_m))
  order by distancia_km nulls last, p.precio_desde nulls last
  limit least(p_limit, 50) offset greatest(p_offset, 0);
$fn$;

revoke all on function public.buscar_proveedores from public;
grant execute on function public.buscar_proveedores to anon, authenticated;
