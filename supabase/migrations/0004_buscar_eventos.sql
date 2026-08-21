-- ============================================================
-- RPC de busqueda de eventos: texto + radio km (PostGIS)
-- Espeja buscar_proveedores, pero sobre public.eventos.
--
-- Nota: postgis, pg_trgm y unaccent viven en el esquema `extensions`,
-- por eso toda funcion que los use necesita ese esquema en su search_path.
-- ============================================================

-- Wrapper inmutable de unaccent: unaccent() es STABLE y no se puede indexar.
-- Ya existe en la base; se crea solo si falta, para que la migracion sea
-- reproducible desde cero sin pisar la definicion actual.
do $do$
begin
  if to_regprocedure('public.f_unaccent(text)') is null then
    create function public.f_unaccent(text)
    returns text language sql immutable
    set search_path = extensions, public as $fn$
      select unaccent('unaccent'::regdictionary, $1)
    $fn$;
  end if;
end
$do$;

create or replace function public.buscar_eventos(
  p_query   text default null,
  p_lat     double precision default null,
  p_lng     double precision default null,
  p_radio_m integer default 25000,
  p_limit   integer default 12,
  p_offset  integer default 0
)
returns table (
  id uuid, nombre text, fecha date, hora_inicio time, direccion text,
  portada_url text, precio_clp integer, capacidad integer,
  distancia_km double precision
)
language sql stable security invoker set search_path = public, extensions as $fn$
  with punto as (
    select case when p_lat is null or p_lng is null then null
                else st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography end as g
  )
  select e.id, e.nombre, e.fecha, e.hora_inicio, e.direccion,
         e.portada_url, e.precio_clp, e.capacidad,
         case when punto.g is null then null
              else round((st_distance(e.ubicacion, punto.g) / 1000)::numeric, 1)::double precision
         end as distancia_km
  from public.eventos e, punto
  where e.fecha >= current_date
    and (p_query is null or p_query = '' or
         public.f_unaccent(e.nombre) ilike '%' || public.f_unaccent(p_query) || '%' or
         public.f_unaccent(coalesce(e.descripcion,'')) ilike '%' || public.f_unaccent(p_query) || '%' or
         public.f_unaccent(coalesce(e.direccion,'')) ilike '%' || public.f_unaccent(p_query) || '%')
    and (punto.g is null or st_dwithin(e.ubicacion, punto.g, p_radio_m))
  order by distancia_km nulls last, e.fecha, e.hora_inicio
  limit least(p_limit, 50) offset greatest(p_offset, 0);
$fn$;

revoke all on function public.buscar_eventos from public;
grant execute on function public.buscar_eventos to anon, authenticated;

-- Acelera el filtro por texto del buscador
create index eventos_busqueda_trgm on public.eventos
  using gin (
    (public.f_unaccent(nombre) || ' ' || public.f_unaccent(coalesce(descripcion,'')))
    extensions.gin_trgm_ops
  );
