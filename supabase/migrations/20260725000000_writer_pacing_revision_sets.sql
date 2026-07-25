-- Durable, owner-scoped review records for preview-first pacing revisions.

CREATE TABLE public.writer_pacing_revision_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES public.writer_issues (id) ON DELETE CASCADE,
  source_outline_id UUID REFERENCES public.writer_issue_outlines (id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (
    status IN ('generating', 'partially_ready', 'ready', 'applying', 'applied', 'failed', 'discarded')
  ),
  pacing_review_json JSONB NOT NULL,
  source_outline_json JSONB NOT NULL,
  proposed_outline_json JSONB,
  source_fingerprint TEXT NOT NULL,
  progress_json JSONB NOT NULL DEFAULT '{"total_pages":0,"completed_pages":[],"current_page":null,"stopped":false}'::JSONB,
  failure_ledger JSONB NOT NULL DEFAULT '[]'::JSONB,
  apply_snapshot JSONB,
  recovery_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.writer_pacing_revision_items (
  id UUID PRIMARY KEY,
  revision_set_id UUID NOT NULL REFERENCES public.writer_pacing_revision_sets (id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position >= 0),
  title TEXT NOT NULL,
  rationale TEXT NOT NULL,
  affected_page_numbers INTEGER[] NOT NULL DEFAULT '{}',
  generation_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    generation_status IN ('pending', 'ready', 'failed', 'stale', 'locked', 'applied')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (revision_set_id, position)
);

CREATE TABLE public.writer_pacing_revision_changes (
  id UUID PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.writer_pacing_revision_items (id) ON DELETE CASCADE,
  layer TEXT NOT NULL CHECK (layer IN ('outline', 'beats', 'dialogue')),
  target_key TEXT NOT NULL,
  page_id UUID REFERENCES public.writer_pages (id) ON DELETE SET NULL,
  page_number INTEGER CHECK (page_number IS NULL OR page_number > 0),
  current_value JSONB,
  ai_proposal JSONB NOT NULL,
  edited_candidate JSONB,
  decision TEXT NOT NULL DEFAULT 'pending' CHECK (decision IN ('pending', 'approved', 'rejected')),
  dependency_ids UUID[] NOT NULL DEFAULT '{}',
  reason TEXT NOT NULL,
  source_fingerprint TEXT NOT NULL,
  generation_status TEXT NOT NULL DEFAULT 'ready' CHECK (
    generation_status IN ('pending', 'ready', 'failed', 'stale', 'locked', 'applied')
  ),
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (item_id, layer, target_key)
);

CREATE INDEX writer_pacing_revision_sets_issue_idx
  ON public.writer_pacing_revision_sets (issue_id, created_at DESC);
CREATE INDEX writer_pacing_revision_items_set_idx
  ON public.writer_pacing_revision_items (revision_set_id, position);
CREATE INDEX writer_pacing_revision_changes_item_idx
  ON public.writer_pacing_revision_changes (item_id, layer, page_number);

CREATE OR REPLACE FUNCTION public.set_writer_pacing_revision_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER writer_pacing_revision_sets_set_updated_at
BEFORE UPDATE ON public.writer_pacing_revision_sets
FOR EACH ROW EXECUTE FUNCTION public.set_writer_pacing_revision_updated_at();

CREATE TRIGGER writer_pacing_revision_items_set_updated_at
BEFORE UPDATE ON public.writer_pacing_revision_items
FOR EACH ROW EXECUTE FUNCTION public.set_writer_pacing_revision_updated_at();

CREATE TRIGGER writer_pacing_revision_changes_set_updated_at
BEFORE UPDATE ON public.writer_pacing_revision_changes
FOR EACH ROW EXECUTE FUNCTION public.set_writer_pacing_revision_updated_at();

ALTER TABLE public.writer_pacing_revision_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.writer_pacing_revision_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.writer_pacing_revision_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "writer_pacing_revision_sets_owner_all"
ON public.writer_pacing_revision_sets
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.writer_issues i
    JOIN public.writer_series s ON s.id = i.series_id
    WHERE i.id = writer_pacing_revision_sets.issue_id
      AND s.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.writer_issues i
    JOIN public.writer_series s ON s.id = i.series_id
    WHERE i.id = writer_pacing_revision_sets.issue_id
      AND s.owner_id = auth.uid()
  )
);

CREATE POLICY "writer_pacing_revision_items_owner_all"
ON public.writer_pacing_revision_items
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.writer_pacing_revision_sets r
    JOIN public.writer_issues i ON i.id = r.issue_id
    JOIN public.writer_series s ON s.id = i.series_id
    WHERE r.id = writer_pacing_revision_items.revision_set_id
      AND s.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.writer_pacing_revision_sets r
    JOIN public.writer_issues i ON i.id = r.issue_id
    JOIN public.writer_series s ON s.id = i.series_id
    WHERE r.id = writer_pacing_revision_items.revision_set_id
      AND s.owner_id = auth.uid()
  )
);

CREATE POLICY "writer_pacing_revision_changes_owner_all"
ON public.writer_pacing_revision_changes
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.writer_pacing_revision_items ri
    JOIN public.writer_pacing_revision_sets r ON r.id = ri.revision_set_id
    JOIN public.writer_issues i ON i.id = r.issue_id
    JOIN public.writer_series s ON s.id = i.series_id
    WHERE ri.id = writer_pacing_revision_changes.item_id
      AND s.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.writer_pacing_revision_items ri
    JOIN public.writer_pacing_revision_sets r ON r.id = ri.revision_set_id
    JOIN public.writer_issues i ON i.id = r.issue_id
    JOIN public.writer_series s ON s.id = i.series_id
    WHERE ri.id = writer_pacing_revision_changes.item_id
      AND s.owner_id = auth.uid()
  )
);
