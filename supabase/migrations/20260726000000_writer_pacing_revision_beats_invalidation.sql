-- Keep Dialogue proposals aligned with the effective Page Beats candidate.

CREATE OR REPLACE FUNCTION public.invalidate_pacing_dialogue_after_beats_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF new.layer = 'beats'
    AND (
      new.ai_proposal IS DISTINCT FROM old.ai_proposal
      OR new.edited_candidate IS DISTINCT FROM old.edited_candidate
    )
  THEN
    UPDATE public.writer_pacing_revision_changes
    SET
      generation_status = 'stale',
      decision = 'pending',
      edited_candidate = NULL,
      applied_at = NULL
    WHERE item_id = new.item_id
      AND layer = 'dialogue'
      AND target_key = new.target_key
      AND new.id = ANY(dependency_ids);

    UPDATE public.writer_pacing_revision_items
    SET generation_status = 'pending'
    WHERE id = new.item_id
      AND generation_status NOT IN ('locked', 'applied');

    UPDATE public.writer_pacing_revision_sets AS revision_set
    SET
      status = 'partially_ready',
      progress_json = jsonb_set(
        revision_set.progress_json,
        '{completed_pages}',
        COALESCE(
          (
            SELECT jsonb_agg(completed_page)
            FROM jsonb_array_elements(revision_set.progress_json -> 'completed_pages') AS completed_page
            WHERE completed_page <> to_jsonb(new.page_number)
          ),
          '[]'::jsonb
        )
      )
    FROM public.writer_pacing_revision_items AS revision_item
    WHERE revision_item.id = new.item_id
      AND revision_set.id = revision_item.revision_set_id
      AND revision_set.status NOT IN ('applied', 'discarded');
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS writer_pacing_revision_beats_invalidate_dialogue
  ON public.writer_pacing_revision_changes;

CREATE TRIGGER writer_pacing_revision_beats_invalidate_dialogue
BEFORE UPDATE OF ai_proposal, edited_candidate
ON public.writer_pacing_revision_changes
FOR EACH ROW
EXECUTE FUNCTION public.invalidate_pacing_dialogue_after_beats_change();
