-- Recoverable Trash for Writers' Workshop series and issues.
-- Issue numbers remain unique across active and trashed rows so restoring an
-- issue can never collide with a newer issue that reused its number.

ALTER TABLE public.writer_series
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.writer_issues
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_writer_series_owner_active
  ON public.writer_series (owner_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_writer_series_owner_trash
  ON public.writer_series (owner_id, deleted_at DESC)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_writer_issues_series_active
  ON public.writer_issues (series_id, issue_number)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_writer_issues_series_trash
  ON public.writer_issues (series_id, deleted_at DESC)
  WHERE deleted_at IS NOT NULL;
