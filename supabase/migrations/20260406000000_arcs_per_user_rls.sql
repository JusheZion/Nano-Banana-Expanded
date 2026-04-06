-- Per-user row ownership and strict RLS for Writers' Workshop + Image Vault.
-- Replaces permissive "Allow all" policies with authenticated, owner-scoped policies.
-- Storage bucket policy remains unchanged in this migration (public arcs-generations stays as-is).

-- 1. Ownership columns (series root + vault rows)
ALTER TABLE public.writer_series
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users (id) ON DELETE CASCADE;

ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users (id) ON DELETE CASCADE;

ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users (id) ON DELETE CASCADE;

-- 2. Backfill to the earliest auth user (single-tenant / first deploy)
UPDATE public.writer_series
SET owner_id = (SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1)
WHERE owner_id IS NULL;

UPDATE public.characters
SET owner_id = (SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1)
WHERE owner_id IS NULL;

UPDATE public.assets
SET owner_id = (SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1)
WHERE owner_id IS NULL;

-- 3. Remove rows that cannot be tied to a user (e.g. DB seeded before any signup)
DELETE FROM public.writer_series WHERE owner_id IS NULL;
DELETE FROM public.characters WHERE owner_id IS NULL;
DELETE FROM public.assets WHERE owner_id IS NULL;

-- 4. Enforce NOT NULL + insert default for signed-in clients
ALTER TABLE public.writer_series
  ALTER COLUMN owner_id SET NOT NULL,
  ALTER COLUMN owner_id SET DEFAULT auth.uid();

ALTER TABLE public.characters
  ALTER COLUMN owner_id SET NOT NULL,
  ALTER COLUMN owner_id SET DEFAULT auth.uid();

ALTER TABLE public.assets
  ALTER COLUMN owner_id SET NOT NULL,
  ALTER COLUMN owner_id SET DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS idx_writer_series_owner ON public.writer_series (owner_id);
CREATE INDEX IF NOT EXISTS idx_characters_owner ON public.characters (owner_id);
CREATE INDEX IF NOT EXISTS idx_assets_owner ON public.assets (owner_id);

-- 5. Drop permissive writer_* policies
DROP POLICY IF EXISTS "Allow all writer_series" ON public.writer_series;
DROP POLICY IF EXISTS "Allow all writer_issues" ON public.writer_issues;
DROP POLICY IF EXISTS "Allow all writer_issue_outlines" ON public.writer_issue_outlines;
DROP POLICY IF EXISTS "Allow all writer_pages" ON public.writer_pages;
DROP POLICY IF EXISTS "Allow all writer_cast" ON public.writer_cast;
DROP POLICY IF EXISTS "Allow all writer_locations" ON public.writer_locations;
DROP POLICY IF EXISTS "Allow all writer_style_bibles" ON public.writer_style_bibles;
DROP POLICY IF EXISTS "Allow all writer_video_shot_plans" ON public.writer_video_shot_plans;

-- 6. Writers' Room: policies scoped to series.owner_id = auth.uid()
CREATE POLICY "writer_series_owner_all" ON public.writer_series
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "writer_issues_series_owner_all" ON public.writer_issues
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.writer_series s
      WHERE s.id = writer_issues.series_id AND s.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.writer_series s
      WHERE s.id = writer_issues.series_id AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "writer_issue_outlines_owner_all" ON public.writer_issue_outlines
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.writer_issues i
      JOIN public.writer_series s ON s.id = i.series_id
      WHERE i.id = writer_issue_outlines.issue_id AND s.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.writer_issues i
      JOIN public.writer_series s ON s.id = i.series_id
      WHERE i.id = writer_issue_outlines.issue_id AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "writer_pages_owner_all" ON public.writer_pages
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.writer_issues i
      JOIN public.writer_series s ON s.id = i.series_id
      WHERE i.id = writer_pages.issue_id AND s.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.writer_issues i
      JOIN public.writer_series s ON s.id = i.series_id
      WHERE i.id = writer_pages.issue_id AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "writer_video_shot_plans_owner_all" ON public.writer_video_shot_plans
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.writer_issues i
      JOIN public.writer_series s ON s.id = i.series_id
      WHERE i.id = writer_video_shot_plans.issue_id AND s.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.writer_issues i
      JOIN public.writer_series s ON s.id = i.series_id
      WHERE i.id = writer_video_shot_plans.issue_id AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "writer_cast_owner_all" ON public.writer_cast
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.writer_series s
      WHERE s.id = writer_cast.series_id AND s.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.writer_series s
      WHERE s.id = writer_cast.series_id AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "writer_locations_owner_all" ON public.writer_locations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.writer_series s
      WHERE s.id = writer_locations.series_id AND s.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.writer_series s
      WHERE s.id = writer_locations.series_id AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "writer_style_bibles_owner_all" ON public.writer_style_bibles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.writer_series s
      WHERE s.id = writer_style_bibles.series_id AND s.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.writer_series s
      WHERE s.id = writer_style_bibles.series_id AND s.owner_id = auth.uid()
    )
  );

-- 7. Vault tables: drop anon-friendly policies; owner-only for authenticated
DROP POLICY IF EXISTS "Allow all for characters" ON public.characters;
DROP POLICY IF EXISTS "Allow all for assets" ON public.assets;

CREATE POLICY "vault_characters_owner_all" ON public.characters
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "vault_assets_owner_all" ON public.assets
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
