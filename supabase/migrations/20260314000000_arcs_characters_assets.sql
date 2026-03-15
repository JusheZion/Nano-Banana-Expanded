-- ARCS Universal API Bridge: characters and assets tables
-- Run in Supabase SQL editor or via supabase db push

-- characters: semantic id CHAR_[NAME]_[01], metadata_tags JSONB, seed 64-bit
CREATE TABLE IF NOT EXISTS public.characters (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
  metadata_tags JSONB NOT NULL DEFAULT '{}',
  seed BIGINT,
  image_url TEXT,
  name TEXT
);

CREATE INDEX IF NOT EXISTS idx_characters_created_at ON public.characters (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_characters_metadata_tags ON public.characters USING GIN (metadata_tags);

-- assets: semantic id ASST_[NAME]_[01], same shape
CREATE TABLE IF NOT EXISTS public.assets (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
  metadata_tags JSONB NOT NULL DEFAULT '{}',
  seed BIGINT,
  image_url TEXT,
  name TEXT
);

CREATE INDEX IF NOT EXISTS idx_assets_created_at ON public.assets (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assets_metadata_tags ON public.assets USING GIN (metadata_tags);

-- RLS: enable and allow anon for app (tighten in production)
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for characters" ON public.characters FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for assets" ON public.assets FOR ALL USING (true) WITH CHECK (true);
