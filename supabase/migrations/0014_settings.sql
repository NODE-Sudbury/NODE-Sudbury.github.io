-- Single-row org settings table
CREATE TABLE public.settings (
  id          integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  org_name    text NOT NULL DEFAULT 'NODE Sudbury',
  tagline     text,
  description text,
  website_url text,
  email       text,
  linkedin_url text,
  twitter_url  text,
  instagram_url text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings (used on public pages)
CREATE POLICY "settings_select_public"
  ON public.settings FOR SELECT USING (true);

-- Only board members can update settings
CREATE POLICY "settings_update_board"
  ON public.settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id = auth.uid() AND m.role = 'board'
    )
  );

-- Seed default row
INSERT INTO public.settings (id, org_name, tagline)
VALUES (1, 'NODE Sudbury', 'Northern Ontario Dev Exchange')
ON CONFLICT (id) DO NOTHING;
