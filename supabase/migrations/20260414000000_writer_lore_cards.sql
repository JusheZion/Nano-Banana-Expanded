-- Series-scoped lore / worldbuilding cards for Writers' Workshop (AI prompt context).

CREATE TABLE IF NOT EXISTS public.writer_lore_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES public.writer_series (id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'world',
  body TEXT NOT NULL DEFAULT '',
  include_in_prompt BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);

CREATE INDEX IF NOT EXISTS idx_writer_lore_cards_series ON public.writer_lore_cards (series_id);

ALTER TABLE public.writer_lore_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "writer_lore_cards_owner_all" ON public.writer_lore_cards
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.writer_series s
      WHERE s.id = writer_lore_cards.series_id AND s.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.writer_series s
      WHERE s.id = writer_lore_cards.series_id AND s.owner_id = auth.uid()
    )
  );
