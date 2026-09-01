-- Extend event_speakers with missing fields
ALTER TABLE public.event_speakers
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS company text,
  ADD COLUMN IF NOT EXISTS talk_title text,
  ADD COLUMN IF NOT EXISTS talk_description text,
  ADD COLUMN IF NOT EXISTS session_type text NOT NULL DEFAULT 'talk';

-- Board write policy for event_speakers (select already exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'event_speakers' AND policyname = 'board_write_speakers') THEN
    CREATE POLICY "board_write_speakers" ON public.event_speakers
      FOR ALL
      USING ((SELECT is_board() FROM public.members WHERE user_id = auth.uid() LIMIT 1))
      WITH CHECK ((SELECT is_board() FROM public.members WHERE user_id = auth.uid() LIMIT 1));
  END IF;
END $$;

-- Event mentors (per-event, distinct from the gamification mentor_registrations)
CREATE TABLE IF NOT EXISTS public.event_mentors (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  member_id     uuid REFERENCES public.members(id) ON DELETE SET NULL,
  name          text NOT NULL,
  title         text,
  company       text,
  bio           text,
  avatar_url    text,
  expertise_tags text[] NOT NULL DEFAULT '{}',
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.event_mentors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_mentors_select_all" ON public.event_mentors FOR SELECT USING (true);
CREATE POLICY "event_mentors_board_write" ON public.event_mentors
  FOR ALL
  USING ((SELECT is_board() FROM public.members WHERE user_id = auth.uid() LIMIT 1))
  WITH CHECK ((SELECT is_board() FROM public.members WHERE user_id = auth.uid() LIMIT 1));

CREATE INDEX IF NOT EXISTS idx_event_mentors_event ON public.event_mentors(event_id);
