-- ============================================================
-- Bucket publico para las portadas de eventos
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'eventos-portadas',
  'eventos-portadas',
  true,
  8388608,                                              -- 8 MB
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do nothing;

-- La primera carpeta de la ruta debe ser el uid: eventos-portadas/<uid>/<archivo>
create policy "portadas de eventos: subir propia" on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'eventos-portadas'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "portadas de eventos: reemplazar propia" on storage.objects for update
  to authenticated
  using (
    bucket_id = 'eventos-portadas'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "portadas de eventos: borrar propia" on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'eventos-portadas'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Sin policy de select: el bucket es publico y se sirve por URL directa.
