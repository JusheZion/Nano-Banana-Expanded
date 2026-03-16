-- Dual-layer naming for characters: profile_name (album group), cast_name (specific look)
ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS profile_name TEXT,
  ADD COLUMN IF NOT EXISTS cast_name TEXT;

-- Dual-layer naming for assets: collection_name (album group), asset_name (specific)
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS collection_name TEXT,
  ADD COLUMN IF NOT EXISTS asset_name TEXT;

CREATE INDEX IF NOT EXISTS idx_characters_profile_name ON public.characters (profile_name);
CREATE INDEX IF NOT EXISTS idx_assets_collection_name ON public.assets (collection_name);
