-- NODE Events Platform
-- Migration: Engagement domain tables (quiz, whiteboard, scavenger hunt, CFP, Q&A, polls)
-- Generated: 2026-08-29

-- ============================================================
-- Speaker profiles (structured speaker directory)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.speaker_profiles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id  uuid REFERENCES public.members(id) ON DELETE SET NULL,
  name       text NOT NULL,
  bio        text,
  avatar_url text,
  website    text,
  twitter    text
);

CREATE TABLE IF NOT EXISTS public.speaker_talk_history (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  speaker_id   uuid NOT NULL REFERENCES public.speaker_profiles(id) ON DELETE CASCADE,
  event_id     uuid REFERENCES public.events(id) ON DELETE SET NULL,
  title        text NOT NULL,
  talk_date    date,
  slides_url   text
);

-- ============================================================
-- CFP (Call for Papers/Proposals)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cfp_submissions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  member_id      uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  title          text NOT NULL,
  abstract       text,
  talk_format    text,
  duration_mins  smallint,
  deck_url       text,
  past_talk_urls text[],
  blind_token    text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  status         cfp_status NOT NULL DEFAULT 'submitted',
  reviewer_notes text,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cfp_reviewer_assignments (
  cfp_id      uuid NOT NULL REFERENCES public.cfp_submissions(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  PRIMARY KEY (cfp_id, reviewer_id)
);

-- Add cfp_id FK to event_sessions now that cfp_submissions exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'event_sessions_cfp_id_fkey'
  ) THEN
    ALTER TABLE public.event_sessions
      ADD CONSTRAINT event_sessions_cfp_id_fkey
        FOREIGN KEY (cfp_id) REFERENCES public.cfp_submissions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- Session bookmarks
-- ============================================================
CREATE TABLE IF NOT EXISTS public.session_bookmarks (
  session_id uuid NOT NULL REFERENCES public.event_sessions(id) ON DELETE CASCADE,
  member_id  uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  PRIMARY KEY (session_id, member_id)
);

-- ============================================================
-- Quiz
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quiz_templates (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   uuid REFERENCES public.events(id) ON DELETE SET NULL,
  title      text NOT NULL,
  created_by uuid REFERENCES public.members(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id  uuid NOT NULL REFERENCES public.quiz_templates(id) ON DELETE CASCADE,
  question     text NOT NULL,
  options      jsonb NOT NULL DEFAULT '[]',
  correct_idx  smallint NOT NULL,
  time_limit_s smallint NOT NULL DEFAULT 30 CONSTRAINT chk_time_limit_s_positive CHECK (time_limit_s > 0),
  points       smallint NOT NULL DEFAULT 100,
  sort_order   smallint NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.quiz_rooms (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id  uuid NOT NULL REFERENCES public.quiz_templates(id) ON DELETE CASCADE,
  event_id     uuid REFERENCES public.events(id) ON DELETE SET NULL,
  join_code    text UNIQUE DEFAULT upper(encode(gen_random_bytes(3), 'hex')),
  state        text NOT NULL DEFAULT 'lobby',
  current_q    smallint,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quiz_participants (
  room_id    uuid NOT NULL REFERENCES public.quiz_rooms(id) ON DELETE CASCADE,
  member_id  uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  score      integer NOT NULL DEFAULT 0,
  joined_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, member_id)
);

CREATE TABLE IF NOT EXISTS public.quiz_answers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id       uuid NOT NULL REFERENCES public.quiz_rooms(id) ON DELETE CASCADE,
  question_id   uuid NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  member_id     uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  chosen_idx    smallint NOT NULL,
  is_correct    boolean NOT NULL DEFAULT false,
  points_earned smallint NOT NULL DEFAULT 0,
  answered_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, question_id, member_id)
);

-- ============================================================
-- Whiteboard
-- ============================================================
CREATE TABLE IF NOT EXISTS public.whiteboard_sessions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name       text NOT NULL,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.whiteboard_snapshots (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   uuid NOT NULL REFERENCES public.whiteboard_sessions(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  created_by   uuid REFERENCES public.members(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Scavenger Hunt
-- ============================================================
CREATE TABLE IF NOT EXISTS public.scavenger_hunts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title      text NOT NULL,
  is_active  boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hunt_stations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hunt_id     uuid NOT NULL REFERENCES public.scavenger_hunts(id) ON DELETE CASCADE,
  name        text NOT NULL,
  qr_code     text UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex'),
  points      integer NOT NULL DEFAULT 10,
  sort_order  smallint NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.hunt_stamp_records (
  station_id uuid NOT NULL REFERENCES public.hunt_stations(id) ON DELETE CASCADE,
  member_id  uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  stamped_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (station_id, member_id)
);

CREATE TABLE IF NOT EXISTS public.hunt_completions (
  hunt_id    uuid NOT NULL REFERENCES public.scavenger_hunts(id) ON DELETE CASCADE,
  member_id  uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (hunt_id, member_id)
);

-- ============================================================
-- Emoji reactions (live event reactions)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.emoji_reaction_sessions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  is_active  boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.emoji_reactions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   uuid NOT NULL REFERENCES public.emoji_reaction_sessions(id) ON DELETE CASCADE,
  member_id    uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  emoji        text NOT NULL,
  reacted_at   timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Live Q&A
-- ============================================================
CREATE TABLE IF NOT EXISTS public.live_qa_sessions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  is_open    boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.live_qa_questions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qa_session_id uuid NOT NULL REFERENCES public.live_qa_sessions(id) ON DELETE CASCADE,
  member_id    uuid REFERENCES public.members(id) ON DELETE SET NULL,
  body         text NOT NULL,
  is_anonymous boolean NOT NULL DEFAULT false,
  is_answered  boolean NOT NULL DEFAULT false,
  upvotes      integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.live_qa_upvotes (
  question_id uuid NOT NULL REFERENCES public.live_qa_questions(id) ON DELETE CASCADE,
  member_id   uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  PRIMARY KEY (question_id, member_id)
);

-- ============================================================
-- Live Polls
-- ============================================================
CREATE TABLE IF NOT EXISTS public.live_polls (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  question   text NOT NULL,
  is_open    boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.live_poll_options (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id  uuid NOT NULL REFERENCES public.live_polls(id) ON DELETE CASCADE,
  label    text NOT NULL,
  votes    integer NOT NULL DEFAULT 0,
  sort_order smallint NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.live_poll_votes (
  option_id uuid NOT NULL REFERENCES public.live_poll_options(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  PRIMARY KEY (option_id, member_id)
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_cfp_event    ON public.cfp_submissions(event_id);
CREATE INDEX IF NOT EXISTS idx_cfp_member   ON public.cfp_submissions(member_id);
CREATE INDEX IF NOT EXISTS idx_cfp_status   ON public.cfp_submissions(status);
CREATE INDEX IF NOT EXISTS idx_quiz_rooms_code ON public.quiz_rooms(join_code);
CREATE INDEX IF NOT EXISTS idx_qa_session   ON public.live_qa_questions(qa_session_id);
CREATE INDEX IF NOT EXISTS idx_poll_options ON public.live_poll_options(poll_id);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.speaker_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speaker_talk_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cfp_submissions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cfp_reviewer_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_bookmarks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_templates       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_rooms           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_participants    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whiteboard_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whiteboard_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scavenger_hunts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hunt_stations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hunt_stamp_records   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hunt_completions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emoji_reaction_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emoji_reactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_qa_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_qa_questions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_qa_upvotes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_polls           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_poll_options    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_poll_votes      ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "speakers_select_all"     ON public.speaker_profiles     FOR SELECT USING (true);
CREATE POLICY "talk_history_select_all" ON public.speaker_talk_history  FOR SELECT USING (true);
CREATE POLICY "quiz_tmpl_select_all"    ON public.quiz_templates        FOR SELECT USING (true);
CREATE POLICY "quiz_q_select_all"       ON public.quiz_questions        FOR SELECT USING (true);
CREATE POLICY "quiz_rooms_select_all"   ON public.quiz_rooms            FOR SELECT USING (true);
CREATE POLICY "quiz_part_select_all"    ON public.quiz_participants     FOR SELECT USING (true);
CREATE POLICY "wb_select_all"           ON public.whiteboard_sessions   FOR SELECT USING (true);
CREATE POLICY "wb_snap_select_all"      ON public.whiteboard_snapshots  FOR SELECT USING (true);
CREATE POLICY "hunts_select_all"        ON public.scavenger_hunts       FOR SELECT USING (true);
CREATE POLICY "hunt_sta_select_all"     ON public.hunt_stations         FOR SELECT USING (true);
CREATE POLICY "hunt_stamps_select_own"  ON public.hunt_stamp_records    FOR SELECT USING (member_id = auth.uid());
CREATE POLICY "hunt_comp_select_own"    ON public.hunt_completions      FOR SELECT USING (member_id = auth.uid());
CREATE POLICY "emoji_ses_select_all"    ON public.emoji_reaction_sessions FOR SELECT USING (true);
CREATE POLICY "emoji_rx_select_all"     ON public.emoji_reactions        FOR SELECT USING (true);
CREATE POLICY "qa_ses_select_all"       ON public.live_qa_sessions       FOR SELECT USING (true);
CREATE POLICY "qa_q_select_all"         ON public.live_qa_questions      FOR SELECT USING (true);
CREATE POLICY "polls_select_all"        ON public.live_polls             FOR SELECT USING (true);
CREATE POLICY "poll_opts_select_all"    ON public.live_poll_options      FOR SELECT USING (true);
CREATE POLICY "sbookmarks_select_own"   ON public.session_bookmarks      FOR SELECT USING (member_id = auth.uid());
CREATE POLICY "quiz_ans_select_own"     ON public.quiz_answers           FOR SELECT USING (member_id = auth.uid());
CREATE POLICY "qa_upvotes_select_own"   ON public.live_qa_upvotes        FOR SELECT USING (member_id = auth.uid());
CREATE POLICY "poll_votes_select_own"   ON public.live_poll_votes        FOR SELECT USING (member_id = auth.uid());

-- CFP: submitter sees own; board sees all
CREATE POLICY "cfp_select_own"          ON public.cfp_submissions FOR SELECT USING (member_id = auth.uid() OR public.is_board());
CREATE POLICY "cfp_insert_own"          ON public.cfp_submissions FOR INSERT WITH CHECK (member_id = auth.uid());
CREATE POLICY "cfp_update_own"          ON public.cfp_submissions FOR UPDATE USING (member_id = auth.uid() AND status = 'submitted');
CREATE POLICY "cfp_board_all"           ON public.cfp_submissions FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());

-- Member write policies
CREATE POLICY "sbookmarks_insert_own"   ON public.session_bookmarks    FOR INSERT WITH CHECK (member_id = auth.uid());
CREATE POLICY "sbookmarks_delete_own"   ON public.session_bookmarks    FOR DELETE USING (member_id = auth.uid());
CREATE POLICY "quiz_part_insert_own"    ON public.quiz_participants     FOR INSERT WITH CHECK (member_id = auth.uid());
CREATE POLICY "quiz_ans_insert_own"     ON public.quiz_answers          FOR INSERT WITH CHECK (member_id = auth.uid());
CREATE POLICY "hunt_stamps_insert_own"  ON public.hunt_stamp_records    FOR INSERT WITH CHECK (member_id = auth.uid());
CREATE POLICY "hunt_comp_insert_own"    ON public.hunt_completions      FOR INSERT WITH CHECK (member_id = auth.uid());
CREATE POLICY "emoji_rx_insert_own"     ON public.emoji_reactions       FOR INSERT WITH CHECK (member_id = auth.uid());
CREATE POLICY "qa_q_insert_own"         ON public.live_qa_questions     FOR INSERT WITH CHECK (member_id = auth.uid() OR is_anonymous = true);
CREATE POLICY "qa_upvote_insert_own"    ON public.live_qa_upvotes       FOR INSERT WITH CHECK (member_id = auth.uid());
CREATE POLICY "qa_upvote_delete_own"    ON public.live_qa_upvotes       FOR DELETE USING (member_id = auth.uid());
CREATE POLICY "poll_vote_insert_own"    ON public.live_poll_votes       FOR INSERT WITH CHECK (member_id = auth.uid());
CREATE POLICY "poll_vote_delete_own"    ON public.live_poll_votes       FOR DELETE USING (member_id = auth.uid());

-- Board manages engagement content
CREATE POLICY "quiz_tmpl_board_all"    ON public.quiz_templates           FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());
CREATE POLICY "quiz_q_board_all"       ON public.quiz_questions           FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());
CREATE POLICY "quiz_rooms_board_all"   ON public.quiz_rooms               FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());
CREATE POLICY "wb_board_all"           ON public.whiteboard_sessions      FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());
CREATE POLICY "hunts_board_all"        ON public.scavenger_hunts          FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());
CREATE POLICY "hunt_sta_board_all"     ON public.hunt_stations            FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());
CREATE POLICY "qa_ses_board_all"       ON public.live_qa_sessions         FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());
CREATE POLICY "polls_board_all"        ON public.live_polls               FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());
CREATE POLICY "poll_opts_board_all"    ON public.live_poll_options        FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());
CREATE POLICY "emoji_ses_board_all"    ON public.emoji_reaction_sessions  FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());
