-- Extend hackathon_rounds with status and max_advancing
ALTER TABLE public.hackathon_rounds ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.hackathon_rounds ADD COLUMN IF NOT EXISTS max_advancing integer;

-- Extend hackathon_round_teams with score
ALTER TABLE public.hackathon_round_teams ADD COLUMN IF NOT EXISTS score numeric DEFAULT 0;
ALTER TABLE public.hackathon_round_teams ADD COLUMN IF NOT EXISTS seed integer;

-- Head-to-head matchups (optional, for single-elimination style)
CREATE TABLE IF NOT EXISTS public.bracket_matchups (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id      uuid NOT NULL REFERENCES public.hackathon_rounds(id) ON DELETE CASCADE,
  team_a_id     uuid REFERENCES public.hackathon_teams(id) ON DELETE CASCADE,
  team_b_id     uuid REFERENCES public.hackathon_teams(id) ON DELETE CASCADE,
  winner_team_id uuid REFERENCES public.hackathon_teams(id) ON DELETE SET NULL,
  judge_notes   text,
  decided_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bracket_matchups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "matchups_select_all" ON public.bracket_matchups FOR SELECT USING (true);
CREATE POLICY "matchups_board_all"  ON public.bracket_matchups FOR ALL
  USING (public.is_board()) WITH CHECK (public.is_board());

-- Board write policies for rounds (may already exist, use IF NOT EXISTS pattern)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'hackathon_rounds' AND policyname = 'hrounds_board_all'
  ) THEN
    CREATE POLICY "hrounds_board_all" ON public.hackathon_rounds
      FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'hackathon_round_teams' AND policyname = 'hrt_board_all'
  ) THEN
    CREATE POLICY "hrt_board_all" ON public.hackathon_round_teams
      FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());
  END IF;
END $$;
