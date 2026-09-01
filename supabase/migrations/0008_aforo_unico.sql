-- ============================================================
-- XFest — un solo dueno del aforo
-- ============================================================
-- Script IDEMPOTENTE. Va DESPUES de 0007: usa `fecha_termino`, la
-- columna que 0007 introdujo para las fiestas que cruzan la medianoche.
--
-- Contexto: el proyecto quedo con DOS sistemas contando contra el mismo
-- `eventos.capacidad`, construidos en paralelo por cada uno:
--
--   asistencias   (guardado / confirmado)           -> intencion
--   inscripciones (pendiente/confirmada/cancelada)  -> registro real
--
-- Cada uno tenia su propio control de cupos leyendo su propia tabla, y
-- ninguno veia al otro. Una fiesta de 10 lugares admitia 10 asistencias
-- confirmadas Y 10 inscripciones: 20 personas con cupo. El merge de git
-- pasa limpio; el choque solo aparece en ejecucion.
--
-- La inscripcion es el hecho: tiene identidad, RUT y pago. La asistencia
-- es solo intencion. El aforo lo controla inscribir_en_evento() y nadie mas.
-- ============================================================

-- 1. El control de cupos sobre asistencias deja de existir.
--    Marcar "voy a ir" vuelve a no reservar nada.
drop trigger if exists trg_controlar_cupos on public.asistencias;
drop function if exists public.controlar_cupos();

-- 2. `eventos_cupos` contaba asistencias. Ahora refleja la ocupacion real.
--    Sin security_invoker a proposito: agrega por encima de la RLS para
--    publicar el NUMERO sin revelar quien va.
drop view if exists public.eventos_cupos;
create view public.eventos_cupos as
select
  e.id                    as evento_id,
  e.capacidad,
  coalesce(i.ocupados, 0) as confirmados,
  case when e.capacidad is null then null
       else greatest(e.capacidad - coalesce(i.ocupados, 0), 0) end as disponibles,
  case when e.capacidad is null then false
       else coalesce(i.ocupados, 0) >= e.capacidad end             as agotado
from public.eventos e
left join (
  select evento_id, count(*)::int as ocupados
  from public.inscripciones
  where estado <> 'cancelada'
  group by evento_id
) i on i.evento_id = e.id;

grant select on public.eventos_cupos to anon, authenticated;

-- 3. Valorar: vale haberse INSCRITO o haber confirmado asistencia.
--    Se conserva `fecha_termino` de 0007 (la fiesta de 22:00 a 04:00 no
--    termina el mismo dia que empieza) y se suma la via de inscripcion.
--    Se aceptan ambas para no dejar fuera a quien uso el flujo ligero en
--    una fiesta gratis, que nunca pasa por el formulario de inscripcion.
create or replace function public.puede_valorar(p_evento_id uuid)
returns boolean
language sql stable security definer set search_path = public as $fn$
  select exists (
    select 1
    from public.eventos e
    where e.id = p_evento_id
      and e.owner_id <> auth.uid()
      and (e.fecha_termino + e.hora_termino) < now()
      and (
        exists (
          select 1 from public.inscripciones i
          where i.evento_id = e.id
            and i.usuario_id = auth.uid()
            and i.estado <> 'cancelada'
        )
        or exists (
          select 1 from public.asistencias a
          where a.evento_id = e.id
            and a.user_id = auth.uid()
            and a.estado = 'confirmado'
        )
      )
  );
$fn$;

revoke all on function public.puede_valorar(uuid) from public;
grant execute on function public.puede_valorar(uuid) to authenticated;
