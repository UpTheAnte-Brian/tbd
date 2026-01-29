-- Create avatars storage bucket + policies

-- Bucket
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

update storage.buckets
  set public = true
  where id = 'avatars';

-- RLS policies
-- Public read access for avatars
create policy "avatars public read"
  on storage.objects
  for select
  using (bucket_id = 'avatars');

-- Authenticated users can upload avatars
create policy "avatars authenticated insert"
  on storage.objects
  for insert
  with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
  );

-- Owners can update their avatars
create policy "avatars owner update"
  on storage.objects
  for update
  using (
    bucket_id = 'avatars'
    and owner = auth.uid()
  )
  with check (
    bucket_id = 'avatars'
    and owner = auth.uid()
  );

-- Owners can delete their avatars
create policy "avatars owner delete"
  on storage.objects
  for delete
  using (
    bucket_id = 'avatars'
    and owner = auth.uid()
  );
