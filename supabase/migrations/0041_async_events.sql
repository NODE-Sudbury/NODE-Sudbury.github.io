-- Migration: Async event challenges and submissions
-- Extends existing async_event_windows with per-challenge submissions

CREATE TABLE IF NOT EXISTS public.async_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  submission_type text NOT NULL DEFAULT 'url', -- 'url'|'text'|'file_url'|'github'
  submission_instructions text,
  max_submissions_per_member integer DEFAULT 1,
  submissions_open_at timestamptz,
  submissions_close_at timestamptz,
  results_at timestamptz,
  allow_updates boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.async_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.async_challenges(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  submission_url text,
  submission_text text,
  status text NOT NULL DEFAULT 'draft',
  reviewer_notes text,
  score numeric,
  submitted_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, member_id)
);

ALTER TABLE public.async_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.async_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "async_challenges_select_all" ON public.async_challenges FOR SELECT USING (true);
CREATE POLICY "async_challenges_board_all" ON public.async_challenges FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());

CREATE POLICY "async_submissions_insert_own" ON public.async_submissions FOR INSERT
  WITH CHECK (auth.uid() = (SELECT user_id FROM public.members WHERE id = member_id));
CREATE POLICY "async_submissions_select_own" ON public.async_submissions FOR SELECT
  USING (auth.uid() = (SELECT user_id FROM public.members WHERE id = member_id));
CREATE POLICY "async_submissions_update_own" ON public.async_submissions FOR UPDATE
  USING (auth.uid() = (SELECT user_id FROM public.members WHERE id = member_id) AND status IN ('draft', 'submitted'));
CREATE POLICY "async_submissions_board_all" ON public.async_submissions FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());
