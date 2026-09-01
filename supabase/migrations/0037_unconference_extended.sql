-- Extend unconference_sessions with missing columns
ALTER TABLE public.unconference_sessions ADD COLUMN IF NOT EXISTS session_type text NOT NULL DEFAULT 'talk';
ALTER TABLE public.unconference_sessions ADD COLUMN IF NOT EXISTS max_attendees integer;
ALTER TABLE public.unconference_sessions ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'proposed';
ALTER TABLE public.unconference_sessions ADD COLUMN IF NOT EXISTS dot_votes integer NOT NULL DEFAULT 0;

-- Dot-vote tracking (separate from unconference_interests which tracks attendance interest)
CREATE TABLE IF NOT EXISTS public.unconference_votes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.unconference_sessions(id) ON DELETE CASCADE,
  member_id  uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, member_id)
);

ALTER TABLE public.unconference_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read unconf_votes"   ON public.unconference_votes FOR SELECT USING (true);
CREATE POLICY "Members vote"               ON public.unconference_votes FOR INSERT
  WITH CHECK (auth.uid() = (SELECT user_id FROM public.members WHERE id = member_id));
CREATE POLICY "Members delete own vote"    ON public.unconference_votes FOR DELETE
  USING (auth.uid() = (SELECT user_id FROM public.members WHERE id = member_id));

-- Board can manage sessions (update room/time_slot/status)
CREATE POLICY "unconf_update_board" ON public.unconference_sessions FOR UPDATE
  USING ((SELECT is_board() FROM public.members WHERE user_id = auth.uid() LIMIT 1));
CREATE POLICY "unconf_delete_board" ON public.unconference_sessions FOR DELETE
  USING ((SELECT is_board() FROM public.members WHERE user_id = auth.uid() LIMIT 1));
