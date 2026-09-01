-- ============================================================
-- EVENTOS: horario que cruza la medianoche, galeria y precio minimo
-- ============================================================
-- Script IDEMPOTENTE: se puede re-ejecutar completo sin errores.
--
-- Tres arreglos sobre public.eventos:
--
--  1. Una fiesta de 22:00 a 04:00 era imposible: el check comparaba
--     hora_termino > hora_inicio sobre una sola fecha. Se agrega
--     fecha_termino y la comparacion pasa a ser (fecha, hora) completa.
--     Se mantiene `fecha` como fecha de INICIO para no tocar el indice,
--     el orden de los listados ni el RPC de busqueda.
--
--  2. galeria_urls: fotos secundarias, opcionales. Es un array y no una
--     tabla aparte porque no tienen identidad propia (siempre se leen con
--     el evento) y el orden del array ES el orden de la galeria.
--
--  3. La entrada pagada mas barata pasa a ser $1.000; 0 sigue siendo gratis.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Horario con fecha de termino
-- ------------------------------------------------------------
alter table public.eventos
  add column if not exists fecha_termino date;

-- Los eventos que ya existian terminaban el mismo dia por definicion.
update public.eventos set fecha_termino = fecha where fecha_termino is null;

alter table public.eventos
  alter column fecha_termino set not null;

-- El check viejo prohibia justamente el caso que queremos permitir.
alter table public.eventos
  drop constraint if exists eventos_horario_valido;

alter table public.eventos
  drop constraint if exists eventos_termino_posterior;

-- Comparacion de filas: (fecha_termino, hora_termino) > (fecha, hora_inicio).
alter table public.eventos
  add constraint eventos_termino_posterior
  check ((fecha_termino, hora_termino) > (fecha, hora_inicio));

-- Una fiesta no puede durar mas de 3 dias: ataja el dedazo de año en el
-- date picker, que si no se cuela como un evento "eterno" en los listados.
alter table public.eventos
  drop constraint if exists eventos_duracion_razonable;

alter table public.eventos
  add constraint eventos_duracion_razonable
  check (fecha_termino <= fecha + 3);

-- ------------------------------------------------------------
-- 2. Galeria de fotos secundarias
-- ------------------------------------------------------------
alter table public.eventos
  add column if not exists galeria_urls text[] not null default '{}';

alter table public.eventos
  drop constraint if exists eventos_galeria_maxima;

alter table public.eventos
  add constraint eventos_galeria_maxima
  check (array_length(galeria_urls, 1) is null or array_length(galeria_urls, 1) <= 6);

-- ------------------------------------------------------------
-- 3. Precio: gratis o al menos $1.000
-- ------------------------------------------------------------
-- El check original era inline, con nombre autogenerado por Postgres.
alter table public.eventos
  drop constraint if exists eventos_precio_clp_check;

alter table public.eventos
  drop constraint if exists eventos_precio_valido;

-- Un evento ya publicado a $500 haria fallar el ALTER de abajo y con el toda
-- la migracion. Se sube al minimo antes de imponer la regla.
update public.eventos
   set precio_clp = 1000
 where precio_clp between 1 and 999;

alter table public.eventos
  add constraint eventos_precio_valido
  check (precio_clp = 0 or precio_clp >= 1000);

-- ============================================================
-- Funciones que dependian de que el evento terminara el mismo dia
-- ============================================================

-- Un evento que va de 22:00 a 04:00 seguia listado hasta el dia siguiente
-- por `fecha`, pero desaparecia de la busqueda a la medianoche. Ahora la
-- vigencia la manda la fecha de termino.
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
  where e.fecha_termino >= current_date
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

-- puede_valorar() daba por terminada la fiesta de 22:00 a 04:00 a las
-- 04:00 del dia que EMPEZABA, o sea 20 horas antes de que ocurriera.
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
      and (e.fecha_termino + e.hora_termino) < now()
  );
$fn$;

revoke all on function public.puede_valorar(uuid) from public;
grant execute on function public.puede_valorar(uuid) to authenticated;

-- ============================================================
-- Conteos de la ficha: cupos tomados vs. gente que realmente va
-- ============================================================
-- La inscripcion es la que manda el conteo real de asistentes, asi que hace
-- falta separar dos numeros que antes eran uno:
--
--   inscritos   -> toman cupo (incluye los pendientes de pago)
--   confirmados -> van de verdad (pago listo, o evento gratis)
--
-- El tipo de retorno cambia, y CREATE OR REPLACE no puede cambiarlo: hay que
-- soltar la version anterior primero.
drop function if exists public.evento_inscritos(uuid);

create or replace function public.evento_inscritos(p_evento_id uuid)
returns table (inscritos integer, confirmados integer)
language sql stable security definer set search_path = public as $fn$
  select
    count(*) filter (where estado <> 'cancelada')::integer,
    count(*) filter (where estado = 'confirmada')::integer
  from public.inscripciones
  where evento_id = p_evento_id;
$fn$;

revoke all on function public.evento_inscritos(uuid) from public;
grant execute on function public.evento_inscritos(uuid) to anon, authenticated;

-- inscribir_en_evento() cerraba las inscripciones a medianoche para una
-- fiesta que todavia estaba ocurriendo.
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
  select e.id, e.capacidad, e.precio_clp, e.fecha_termino
    into v_evento
    from public.eventos e
   where e.id = p_evento_id
     for update;

  if not found then
    raise exception 'EVENTO_NO_EXISTE';
  end if;

  if v_evento.fecha_termino < current_date then
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
