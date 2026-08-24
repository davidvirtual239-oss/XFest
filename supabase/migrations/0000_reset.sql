-- ============================================================
-- FIESTA MAESTRA — teardown de bootstrap
-- ============================================================
-- Borra SOLO los objetos que crea 0001_init.sql. Sirve para volver a
-- un estado limpio mientras se arma el esquema.
--
-- ADVERTENCIA: elimina los datos de esas tablas. Usar unicamente
-- durante el setup inicial, NUNCA contra una base con datos reales.
-- No toca auth.users ni el resto del schema public.
-- ============================================================

drop view     if exists public.proveedores_publicos;

drop function if exists public.buscar_proveedores;
drop function if exists public.proteger_estado_proveedor cascade;
drop function if exists public.es_admin;
drop function if exists public.f_unaccent;

drop table    if exists public.flow_eventos;
drop table    if exists public.ordenes;
drop table    if exists public.proveedores;
drop table    if exists public.perfiles;

drop type     if exists public.estado_proveedor;
drop type     if exists public.categoria_evento;
