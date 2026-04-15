-- Legacy uploads (pre per-user prefix) stored objects at the bucket root: `1774….jpg`
-- with no `{auth.uid()}/` segment. RLS in 20260407120000 only allows SELECT when
-- split_part(name,'/',1) = auth.uid(), so root objects became unreadable and
-- createSignedUrl returned "Object not found" while Postgres rows still referenced them.
--
-- This policy restores read access for root-level objects only (name contains no '/').
-- Prefer moving objects to `{uid}/…` in the Dashboard and removing this policy on
-- multi-tenant deployments where cross-user root reads are unacceptable.

create policy "arcs_generations_select_legacy_root"
on storage.objects for select
to authenticated
using (
  bucket_id = 'arcs-generations'
  and name not like '%/%'
);
