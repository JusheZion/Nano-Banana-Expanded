-- Part B: private arcs-generations bucket, per-user object prefix (auth.uid() / ...).
-- Anonymous clients have no storage access. Authenticated users only read/write/delete under their folder.
-- Legacy objects at bucket root (no "userId/" prefix) are not readable via these policies; re-save from the app or move objects in Dashboard.

update storage.buckets
set public = false
where id = 'arcs-generations';

drop policy if exists "arcs_generations_select_public" on storage.objects;
drop policy if exists "arcs_generations_insert_authenticated" on storage.objects;
drop policy if exists "arcs_generations_insert_anon" on storage.objects;
drop policy if exists "arcs_generations_select_owner" on storage.objects;
drop policy if exists "arcs_generations_insert_owner" on storage.objects;
drop policy if exists "arcs_generations_update_owner" on storage.objects;
drop policy if exists "arcs_generations_delete_owner" on storage.objects;

create policy "arcs_generations_select_owner"
on storage.objects for select
to authenticated
using (
  bucket_id = 'arcs-generations'
  and split_part(name, '/', 1) = (select auth.uid()::text)
);

create policy "arcs_generations_insert_owner"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'arcs-generations'
  and split_part(name, '/', 1) = (select auth.uid()::text)
);

create policy "arcs_generations_update_owner"
on storage.objects for update
to authenticated
using (
  bucket_id = 'arcs-generations'
  and split_part(name, '/', 1) = (select auth.uid()::text)
)
with check (
  bucket_id = 'arcs-generations'
  and split_part(name, '/', 1) = (select auth.uid()::text)
);

create policy "arcs_generations_delete_owner"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'arcs-generations'
  and split_part(name, '/', 1) = (select auth.uid()::text)
);
