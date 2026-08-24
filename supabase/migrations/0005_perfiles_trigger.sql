-- ============================================================
-- Alta automatica de perfiles
-- ============================================================
-- perfiles es 1:1 con auth.users, pero nada creaba la fila: la tabla
-- quedaba vacia y es_admin() devolvia siempre false, dejando inertes
-- todas las policies que dependen de ella.
--
-- Script IDEMPOTENTE: se puede re-ejecutar completo sin errores.
-- Aplicado en produccion el 2026-08-23.
-- ============================================================

create or replace function public.manejar_nuevo_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- perfiles.nombre es NOT NULL: si ningun fallback diera valor, el insert
  -- reventaria y con el la creacion del usuario. De ahi la cadena completa.
  insert into public.perfiles (id, nombre)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'name'), ''),
      split_part(new.email, '@', 1),
      'Usuario'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_nuevo_usuario on auth.users;
create trigger trg_nuevo_usuario
  after insert on auth.users
  for each row execute function public.manejar_nuevo_usuario();

-- Backfill de los usuarios que se registraron antes del trigger.
insert into public.perfiles (id, nombre)
select u.id,
       coalesce(
         nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
         nullif(trim(u.raw_user_meta_data->>'name'), ''),
         split_part(u.email, '@', 1),
         'Usuario')
from auth.users u
on conflict (id) do nothing;
