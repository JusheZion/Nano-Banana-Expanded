-- Per-archive thumbnail framing for Character Archive cards (object-position + zoom)
ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS thumbnail_focus_x REAL NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS thumbnail_focus_y REAL NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS thumbnail_scale REAL NOT NULL DEFAULT 1.0;

COMMENT ON COLUMN public.characters.thumbnail_focus_x IS '0–100, horizontal object-position % for archive card crop';
COMMENT ON COLUMN public.characters.thumbnail_focus_y IS '0–100, vertical object-position % for archive card crop';
COMMENT ON COLUMN public.characters.thumbnail_scale IS '1 = default; >1 zoom in toward focus; <1 show more (zoom out)';
