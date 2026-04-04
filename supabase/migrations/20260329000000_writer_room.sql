-- Writers' Room: series / issues / outlines / pages / cast / locations / style bibles / video shot plans
-- Table names prefixed with writer_ to avoid collision with public.characters (vault).

CREATE TYPE writer_issue_status AS ENUM (
  'idea',
  'outlining',
  'scripting',
  'approved',
  'in_production'
);

CREATE TYPE writer_style_bible_type AS ENUM (
  'worldbuilding',
  'magic_rules',
  'tone_guide',
  'visual_style'
);

CREATE TABLE IF NOT EXISTS public.writer_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT '',
  logline TEXT,
  genre TEXT,
  tone TEXT,
  target_demographic TEXT,
  notes JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);

CREATE TABLE IF NOT EXISTS public.writer_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES public.writer_series (id) ON DELETE CASCADE,
  issue_number INT NOT NULL,
  title TEXT,
  status writer_issue_status NOT NULL DEFAULT 'idea',
  synopsis TEXT,
  notes JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
  UNIQUE (series_id, issue_number)
);

CREATE INDEX IF NOT EXISTS idx_writer_issues_series ON public.writer_issues (series_id);

CREATE TABLE IF NOT EXISTS public.writer_issue_outlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES public.writer_issues (id) ON DELETE CASCADE,
  version INT NOT NULL DEFAULT 1,
  outline_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
  created_by TEXT,
  source_mode TEXT
);

CREATE INDEX IF NOT EXISTS idx_writer_issue_outlines_issue ON public.writer_issue_outlines (issue_id);

CREATE TABLE IF NOT EXISTS public.writer_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES public.writer_issues (id) ON DELETE CASCADE,
  page_number INT NOT NULL,
  beats_json JSONB,
  script_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
  UNIQUE (issue_id, page_number)
);

CREATE INDEX IF NOT EXISTS idx_writer_pages_issue ON public.writer_pages (issue_id);

CREATE TABLE IF NOT EXISTS public.writer_cast (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES public.writer_series (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  personality TEXT,
  speech_style TEXT,
  bio_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);

CREATE INDEX IF NOT EXISTS idx_writer_cast_series ON public.writer_cast (series_id);

CREATE TABLE IF NOT EXISTS public.writer_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES public.writer_series (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  notes JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);

CREATE INDEX IF NOT EXISTS idx_writer_locations_series ON public.writer_locations (series_id);

CREATE TABLE IF NOT EXISTS public.writer_style_bibles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES public.writer_series (id) ON DELETE CASCADE,
  type writer_style_bible_type NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);

CREATE INDEX IF NOT EXISTS idx_writer_style_bibles_series ON public.writer_style_bibles (series_id);

CREATE TABLE IF NOT EXISTS public.writer_video_shot_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES public.writer_issues (id) ON DELETE CASCADE,
  version INT NOT NULL DEFAULT 1,
  shot_plan_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);

CREATE INDEX IF NOT EXISTS idx_writer_video_shot_plans_issue ON public.writer_video_shot_plans (issue_id);

ALTER TABLE public.writer_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.writer_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.writer_issue_outlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.writer_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.writer_cast ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.writer_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.writer_style_bibles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.writer_video_shot_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all writer_series" ON public.writer_series FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all writer_issues" ON public.writer_issues FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all writer_issue_outlines" ON public.writer_issue_outlines FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all writer_pages" ON public.writer_pages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all writer_cast" ON public.writer_cast FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all writer_locations" ON public.writer_locations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all writer_style_bibles" ON public.writer_style_bibles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all writer_video_shot_plans" ON public.writer_video_shot_plans FOR ALL USING (true) WITH CHECK (true);
