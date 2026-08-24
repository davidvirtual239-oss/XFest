-- ============================================================
-- XFest — control de aforo
-- ============================================================
-- Script IDEMPOTENTE, como el resto.
--
-- La regla se aplica en la BASE, no en la aplicacion. Comprobar el
-- cupo en TypeScript antes de insertar tiene una carrera clasica: dos
-- personas confirmando a la vez leen el mismo conteo, ambas lo ven bajo
-- el limite y ambas entran. El unico lugar donde eso se puede cerrar es
-- dentro de la transaccion, tomando un lock.
-- ============================================================

create or replace function public.controlar_cupos()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_capacidad   integer;
  v_confirmados integer;
begin
  -- 'guardado' no ocupa cupo: solo cuenta quien confirma.
  if new.estado <> 'confirmado' then
    return new;
  end if;

  -- Esta persona ya ocupa un cupo: reeditar su fila no consume otro.
  --
  -- Se consulta la tabla en vez de mirar OLD porque un upsert es
  -- INSERT ... ON CONFLICT: el trigger dispara primero como INSERT, con
  -- TG_OP = 'INSERT' y OLD nulo, ANTES de resolver el conflicto. Mirar
  -- solo TG_OP dejaba fuera ese caso y rechazaba a quien ya estaba dentro.
  if exists (
    select 1 from public.asistencias
    where evento_id = new.evento_id
      and user_id   = new.user_id
      and estado    = 'confirmado'
  ) then
    return new;
  end if;

  -- FOR UPDATE bloquea la fila del evento hasta el fin de la transaccion:
  -- dos confirmaciones simultaneas al mismo evento se serializan aqui, y
  -- la segunda ve el conteo ya actualizado por la primera.
  select capacidad into v_capacidad
  from public.eventos
  where id = new.evento_id
  for update;

  -- Sin capacidad declarada = sin limite.
  if v_capacidad is null then
    return new;
  end if;

  select count(*) into v_confirmados
  from public.asistencias
  where evento_id = new.evento_id
    and estado = 'confirmado';

  if v_confirmados >= v_capacidad then
    raise exception 'AFORO_COMPLETO' using errcode = 'P0001';
  end if;

  return new;
end
$fn$;

drop trigger if exists trg_controlar_cupos on public.asistencias;
create trigger trg_controlar_cupos
  before insert or update on public.asistencias
  for each row execute function public.controlar_cupos();

-- ============================================================
-- Cupos disponibles (publico)
-- ============================================================
-- Sin security_invoker a proposito, igual que eventos_asistentes: agrega
-- por encima de la RLS de asistencias para publicar el NUMERO de cupos
-- sin revelar nunca quien va.
drop view if exists public.eventos_cupos;
create view public.eventos_cupos as
select
  e.id                                as evento_id,
  e.capacidad,
  coalesce(a.confirmados, 0)          as confirmados,
  case
    when e.capacidad is null then null
    else greatest(e.capacidad - coalesce(a.confirmados, 0), 0)
  end                                 as disponibles,
  case
    when e.capacidad is null then false
    else coalesce(a.confirmados, 0) >= e.capacidad
  end                                 as agotado
from public.eventos e
left join (
  select evento_id, count(*)::int as confirmados
  from public.asistencias
  where estado = 'confirmado'
  group by evento_id
) a on a.evento_id = e.id;

grant select on public.eventos_cupos to anon, authenticated;
