-- NODE Events Platform
-- Migration: Hackathon domain tables
-- Generated: 2026-08-29

CREATE TABLE IF NOT EXISTS public.hackathon_teams (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name          text NOT NULL,
  invite_code   text UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  max_size      smallint NOT NULL DEFAULT 4,
  is_open       boolean NOT NULL DEFAULT true,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hackathon_team_members (
  team_id   uuid NOT NULL REFERENCES public.hackathon_teams(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  is_lead   boolean NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at   timestamptz,
  PRIMARY KEY (team_id, member_id)
);

CREATE TABLE IF NOT EXISTS public.hackathon_rounds (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name        text NOT NULL,
  round_order smallint NOT NULL DEFAULT 1,
  starts_at   timestamptz,
  ends_at     timestamptz
);

CREATE TABLE IF NOT EXISTS public.hackathon_round_teams (
  round_id    uuid NOT NULL REFERENCES public.hackathon_rounds(id) ON DELETE CASCADE,
  team_id     uuid NOT NULL REFERENCES public.hackathon_teams(id) ON DELETE CASCADE,
  advanced    boolean NOT NULL DEFAULT false,
  PRIMARY KEY (round_id, team_id)
);

CREATE TABLE IF NOT EXISTS public.hackathon_submissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  round_id        uuid REFERENCES public.hackathon_rounds(id) ON DELETE SET NULL,
  team_id         uuid REFERENCES public.hackathon_teams(id) ON DELETE SET NULL,
  solo_member_id  uuid REFERENCES public.members(id) ON DELETE SET NULL,
  title           text NOT NULL,
  description     text,
  repo_url        text,
  demo_url        text,
  deck_url        text,
  screenshot_urls text[],
  prize_tracks    text[],
  sub_status      text NOT NULL DEFAULT 'draft',
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.judging_rubrics (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name        text NOT NULL,
  criteria    jsonb NOT NULL DEFAULT '[]',
  max_score   smallint NOT NULL DEFAULT 10
);

CREATE TABLE IF NOT EXISTS public.judges (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  member_id        uuid REFERENCES public.members(id) ON DELETE SET NULL,
  name             text NOT NULL,
  bio              text,
  avatar_url       text,
  assigned_tracks  text[],
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.judging_assignments (
  judge_id       uuid NOT NULL REFERENCES public.judges(id) ON DELETE CASCADE,
  submission_id  uuid NOT NULL REFERENCES public.hackathon_submissions(id) ON DELETE CASCADE,
  PRIMARY KEY (judge_id, submission_id)
);

CREATE TABLE IF NOT EXISTS public.judging_recusals (
  judge_id       uuid NOT NULL REFERENCES public.judges(id) ON DELETE CASCADE,
  submission_id  uuid NOT NULL REFERENCES public.hackathon_submissions(id) ON DELETE CASCADE,
  reason         text,
  PRIMARY KEY (judge_id, submission_id)
);

CREATE TABLE IF NOT EXISTS public.judging_scores (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  judge_id       uuid NOT NULL REFERENCES public.judges(id) ON DELETE CASCADE,
  submission_id  uuid NOT NULL REFERENCES public.hackathon_submissions(id) ON DELETE CASCADE,
  rubric_id      uuid REFERENCES public.judging_rubrics(id) ON DELETE SET NULL,
  scores         jsonb NOT NULL DEFAULT '{}',
  total_score    numeric,
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (judge_id, submission_id)
);

CREATE TABLE IF NOT EXISTS public.judging_overall (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  submission_id  uuid NOT NULL REFERENCES public.hackathon_submissions(id) ON DELETE CASCADE,
  final_rank     integer,
  avg_score      numeric,
  notes          text,
  UNIQUE (submission_id)
);

CREATE TABLE IF NOT EXISTS public.awards (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  prize_value text
);

CREATE TABLE IF NOT EXISTS public.award_recipients (
  award_id       uuid NOT NULL REFERENCES public.awards(id) ON DELETE CASCADE,
  submission_id  uuid NOT NULL REFERENCES public.hackathon_submissions(id) ON DELETE CASCADE,
  PRIMARY KEY (award_id, submission_id)
);

CREATE TABLE IF NOT EXISTS public.community_votes (
  event_id      uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  member_id     uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  submission_id uuid NOT NULL REFERENCES public.hackathon_submissions(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, member_id)
);

CREATE TABLE IF NOT EXISTS public.ctf_challenges (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title        text NOT NULL,
  description  text,
  category     text,
  points       integer NOT NULL DEFAULT 100,
  flag_hash    text NOT NULL,
  hint         text,
  hint_cost    integer NOT NULL DEFAULT 0,
  is_active    boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.ctf_submissions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.ctf_challenges(id) ON DELETE CASCADE,
  member_id    uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  is_correct   boolean NOT NULL DEFAULT false,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, member_id, is_correct)
);

CREATE TABLE IF NOT EXISTS public.ctf_hint_purchases (
  challenge_id uuid NOT NULL REFERENCES public.ctf_challenges(id) ON DELETE CASCADE,
  member_id    uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (challenge_id, member_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hteams_event       ON public.hackathon_teams(event_id);
CREATE INDEX IF NOT EXISTS idx_hsubmissions_event ON public.hackathon_submissions(event_id);
CREATE INDEX IF NOT EXISTS idx_hsubmissions_team  ON public.hackathon_submissions(team_id);
CREATE INDEX IF NOT EXISTS idx_judges_event        ON public.judges(event_id);
CREATE INDEX IF NOT EXISTS idx_jscores_submission  ON public.judging_scores(submission_id);
CREATE INDEX IF NOT EXISTS idx_ctf_challenges_event ON public.ctf_challenges(event_id);

-- RLS
ALTER TABLE public.hackathon_teams       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathon_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathon_rounds      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathon_round_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathon_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.judging_rubrics       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.judges                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.judging_assignments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.judging_recusals      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.judging_scores        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.judging_overall       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.awards                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.award_recipients      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_votes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ctf_challenges        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ctf_submissions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ctf_hint_purchases    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hteams_select_all"        ON public.hackathon_teams       FOR SELECT USING (true);
CREATE POLICY "hmembers_select_all"      ON public.hackathon_team_members FOR SELECT USING (true);
CREATE POLICY "hrounds_select_all"       ON public.hackathon_rounds       FOR SELECT USING (true);
CREATE POLICY "hrt_select_all"           ON public.hackathon_round_teams  FOR SELECT USING (true);
CREATE POLICY "hsubs_select_all"         ON public.hackathon_submissions   FOR SELECT USING (true);
CREATE POLICY "rubrics_select_all"       ON public.judging_rubrics        FOR SELECT USING (true);
CREATE POLICY "judges_select_all"        ON public.judges                  FOR SELECT USING (true);
CREATE POLICY "jscores_select_board"     ON public.judging_scores         FOR SELECT USING (public.is_board());
CREATE POLICY "joverall_select_all"      ON public.judging_overall        FOR SELECT USING (true);
CREATE POLICY "awards_select_all"        ON public.awards                  FOR SELECT USING (true);
CREATE POLICY "award_recip_select_all"   ON public.award_recipients       FOR SELECT USING (true);
CREATE POLICY "cvotes_select_own"        ON public.community_votes        FOR SELECT USING (member_id = auth.uid());
CREATE POLICY "ctf_challenges_select_all" ON public.ctf_challenges        FOR SELECT USING (is_active = true);
CREATE POLICY "ctf_subs_select_own"      ON public.ctf_submissions        FOR SELECT USING (member_id = auth.uid());
CREATE POLICY "ctf_hints_select_own"     ON public.ctf_hint_purchases     FOR SELECT USING (member_id = auth.uid());

-- Board can manage all hackathon tables
CREATE POLICY "hteams_board_all"    ON public.hackathon_teams       FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());
CREATE POLICY "hrounds_board_all"   ON public.hackathon_rounds      FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());
CREATE POLICY "judges_board_all"    ON public.judges                 FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());
CREATE POLICY "rubrics_board_all"   ON public.judging_rubrics       FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());
CREATE POLICY "awards_board_all"    ON public.awards                 FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());
CREATE POLICY "ctf_board_all"       ON public.ctf_challenges        FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());

-- Members can join/leave teams
CREATE POLICY "hmembers_insert_own" ON public.hackathon_team_members FOR INSERT WITH CHECK (member_id = auth.uid());
CREATE POLICY "hmembers_delete_own" ON public.hackathon_team_members FOR DELETE USING (member_id = auth.uid());

-- Members can submit
CREATE POLICY "hsubs_insert_own" ON public.hackathon_submissions FOR INSERT
  WITH CHECK (solo_member_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.hackathon_team_members htmem
    WHERE htmem.team_id = hackathon_submissions.team_id AND htmem.member_id = auth.uid()
  ));
CREATE POLICY "hsubs_update_own" ON public.hackathon_submissions FOR UPDATE
  USING (solo_member_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.hackathon_team_members htmem
    WHERE htmem.team_id = hackathon_submissions.team_id AND htmem.member_id = auth.uid()
  ));

-- Members can vote once per event
CREATE POLICY "cvotes_insert_own" ON public.community_votes FOR INSERT WITH CHECK (member_id = auth.uid());
CREATE POLICY "cvotes_delete_own" ON public.community_votes FOR DELETE USING (member_id = auth.uid());

-- CTF submissions and hints
CREATE POLICY "ctf_subs_insert_own"  ON public.ctf_submissions    FOR INSERT WITH CHECK (member_id = auth.uid());
CREATE POLICY "ctf_hints_insert_own" ON public.ctf_hint_purchases FOR INSERT WITH CHECK (member_id = auth.uid());

-- Judge insert scores
CREATE POLICY "jscores_insert_judge" ON public.judging_scores FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.judges j WHERE j.id = judging_scores.judge_id AND j.member_id = auth.uid()));
CREATE POLICY "jscores_update_judge" ON public.judging_scores FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.judges j WHERE j.id = judging_scores.judge_id AND j.member_id = auth.uid()));
