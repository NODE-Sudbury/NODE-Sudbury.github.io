-- ============================================================
-- 0035 - Chapters extended: slug, social, chapter_members
-- ============================================================

ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS slug text UNIQUE;
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS website_url text;
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS twitter_handle text;
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS instagram_handle text;

-- Seed default chapter slug
UPDATE public.chapters
SET slug = 'sudbury'
WHERE id = '00000000-0000-0000-0000-000000000001' AND slug IS NULL;

-- Also handle the seed that uses a different insert
UPDATE public.chapters
SET slug = 'sudbury'
WHERE name = 'NODE Sudbury' AND slug IS NULL;

-- Chapter membership table
CREATE TABLE IF NOT EXISTS public.chapter_members (
  chapter_id  uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  member_id   uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'member',
  joined_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (chapter_id, member_id)
);

ALTER TABLE public.chapter_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "chapter_members_select_all"
  ON public.chapter_members FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "chapter_members_board_write"
  ON public.chapter_members FOR ALL
  USING ((SELECT is_board() FROM public.members WHERE user_id = auth.uid() LIMIT 1));
