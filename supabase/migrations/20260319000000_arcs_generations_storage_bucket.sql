-- Public bucket for character/asset images (uploaded from the app after save).
-- Without this bucket + policies, `ensurePersistentImageUrl` cannot upload `blob:` / `data:` images
-- and saves would fail with a clear error instead of persisting broken `blob:` URLs.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'arcs-generations',
  'arcs-generations',
  true,
  52428800,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "arcs_generations_select_public" on storage.objects;
drop policy if exists "arcs_generations_insert_authenticated" on storage.objects;
drop policy if exists "arcs_generations_insert_anon" on storage.objects;

-- Anyone with the public URL can read (required for `<img src="...">` after refresh).
create policy "arcs_generations_select_public"
on storage.objects for select
using (bucket_id = 'arcs-generations');

-- Allow uploads from the browser using the anon key (typical for this app’s `.env` setup).
create policy "arcs_generations_insert_anon"
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'arcs-generations');
