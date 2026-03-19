-- Profile cover support for Character Vault (Ruby & Gold Edition)
-- Single cover per profile_name, optimized lookup via partial index.

ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS is_profile_cover BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_characters_profile_cover
  ON public.characters (profile_name)
  WHERE is_profile_cover = true;

