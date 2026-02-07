-- SELECT: anyone can read branding assets
drop policy if exists "branding-assets select" on storage.objects;
create policy "branding-assets select"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'branding-assets');

-- INSERT: authenticated users can upload
drop policy if exists "branding-assets insert" on storage.objects;
create policy "branding-assets insert"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'branding-assets');

-- UPDATE: authenticated users can modify
drop policy if exists "branding-assets update" on storage.objects;
create policy "branding-assets update"
on storage.objects
for update
to authenticated
using (bucket_id = 'branding-assets')
with check (bucket_id = 'branding-assets');

-- DELETE: authenticated users can delete
drop policy if exists "branding-assets delete" on storage.objects;
create policy "branding-assets delete"
on storage.objects
for delete
to authenticated
using (bucket_id = 'branding-assets');