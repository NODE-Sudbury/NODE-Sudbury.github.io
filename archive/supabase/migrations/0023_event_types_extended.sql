-- NODE Events Platform
-- Migration: Event-type-specific tables (job fair, unconference, demo day, async, etc.)
-- Generated: 2026-08-29

-- ============================================================
-- Event announcements
-- ============================================================
CREATE TABLE IF NOT EXISTS public.event_announcements (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  body       text NOT NULL,
  pinned     boolean NOT NULL DEFAULT false,
  posted_by  uuid REFERENCES public.members(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Session ratings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.session_ratings (
  session_id uuid NOT NULL REFERENCES public.event_sessions(id) ON DELETE CASCADE,
  member_id  uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  rating     smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, member_id)
);

-- ============================================================
-- Equipment checkouts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.equipment_checkouts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  member_id    uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  item_name    text NOT NULL,
  checked_out  timestamptz NOT NULL DEFAULT now(),
  returned_at  timestamptz
);

-- ============================================================
-- Discord webhooks (per-event notifications)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.discord_webhooks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     uuid REFERENCES public.events(id) ON DELETE CASCADE,
  chapter_id   uuid REFERENCES public.chapters(id) ON DELETE CASCADE,
  webhook_url  text NOT NULL,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Event interests (pre-registration intent)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.event_interests (
  event_id   uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  member_id  uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, member_id)
);

-- ============================================================
-- Async event windows (for async_event type)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.async_event_windows (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  opens_at    timestamptz NOT NULL,
  closes_at   timestamptz NOT NULL,
  description text
);

-- ============================================================
-- Job fair
-- ============================================================
CREATE TABLE IF NOT EXISTS public.job_fair_booths (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  logo_url     text,
  booth_number text,
  description  text,
  is_hiring    boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.job_fair_resume_drops (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booth_id  uuid NOT NULL REFERENCES public.job_fair_booths(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  resume_url text,
  dropped_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booth_id, member_id)
);

-- ============================================================
-- Unconference sessions (open-space style)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.unconference_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title       text NOT NULL,
  proposed_by uuid REFERENCES public.members(id) ON DELETE SET NULL,
  room        text,
  time_slot   text,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.unconference_interests (
  session_id uuid NOT NULL REFERENCES public.unconference_sessions(id) ON DELETE CASCADE,
  member_id  uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  PRIMARY KEY (session_id, member_id)
);

-- ============================================================
-- Demo day
-- ============================================================
CREATE TABLE IF NOT EXISTS public.demo_day_showcases (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  team_id     uuid REFERENCES public.hackathon_teams(id) ON DELETE SET NULL,
  member_id   uuid REFERENCES public.members(id) ON DELETE SET NULL,
  title       text NOT NULL,
  description text,
  demo_url    text,
  vote_count  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.demo_day_votes (
  showcase_id uuid NOT NULL REFERENCES public.demo_day_showcases(id) ON DELETE CASCADE,
  member_id   uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  voted_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (showcase_id, member_id)
);

-- ============================================================
-- Email digest queue
-- ============================================================
CREATE TABLE IF NOT EXISTS public.email_digest_queue (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id    uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end   date NOT NULL,
  status       text NOT NULL DEFAULT 'pending',
  sent_at      timestamptz,
  event_count  smallint,
  UNIQUE (member_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_email_digest_status ON public.email_digest_queue(status, period_start);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_announcements_event  ON public.event_announcements(event_id);
CREATE INDEX IF NOT EXISTS idx_session_ratings_sess ON public.session_ratings(session_id);
CREATE INDEX IF NOT EXISTS idx_job_booths_event     ON public.job_fair_booths(event_id);
CREATE INDEX IF NOT EXISTS idx_unconf_sessions_event ON public.unconference_sessions(event_id);
CREATE INDEX IF NOT EXISTS idx_demo_showcases_event  ON public.demo_day_showcases(event_id);
CREATE INDEX IF NOT EXISTS idx_event_interests_event ON public.event_interests(event_id);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.event_announcements    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_ratings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_checkouts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_webhooks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_interests        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.async_event_windows    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_fair_booths        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_fair_resume_drops  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unconference_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unconference_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_day_showcases     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_day_votes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_digest_queue     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "announcements_select_all"  ON public.event_announcements   FOR SELECT USING (true);
CREATE POLICY "announcements_board_all"   ON public.event_announcements   FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());
CREATE POLICY "ratings_select_all"        ON public.session_ratings       FOR SELECT USING (true);
CREATE POLICY "ratings_insert_own"        ON public.session_ratings       FOR INSERT WITH CHECK (member_id = auth.uid());
CREATE POLICY "ratings_update_own"        ON public.session_ratings       FOR UPDATE USING (member_id = auth.uid());
CREATE POLICY "equip_board_all"           ON public.equipment_checkouts   FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());
CREATE POLICY "discord_wh_board_all"      ON public.discord_webhooks      FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());
CREATE POLICY "interests_select_own"      ON public.event_interests       FOR SELECT USING (member_id = auth.uid());
CREATE POLICY "interests_all_own"         ON public.event_interests       FOR ALL USING (member_id = auth.uid()) WITH CHECK (member_id = auth.uid());
CREATE POLICY "async_windows_select_all"  ON public.async_event_windows   FOR SELECT USING (true);
CREATE POLICY "async_windows_board_all"   ON public.async_event_windows   FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());
CREATE POLICY "jf_booths_select_all"      ON public.job_fair_booths       FOR SELECT USING (true);
CREATE POLICY "jf_booths_board_all"       ON public.job_fair_booths       FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());
CREATE POLICY "jf_drops_select_own"       ON public.job_fair_resume_drops FOR SELECT USING (member_id = auth.uid() OR public.is_board());
CREATE POLICY "jf_drops_insert_own"       ON public.job_fair_resume_drops FOR INSERT WITH CHECK (member_id = auth.uid());
CREATE POLICY "unconf_select_all"         ON public.unconference_sessions FOR SELECT USING (true);
CREATE POLICY "unconf_insert_auth"        ON public.unconference_sessions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "unconf_int_select_own"     ON public.unconference_interests FOR SELECT USING (member_id = auth.uid());
CREATE POLICY "unconf_int_all_own"        ON public.unconference_interests FOR ALL USING (member_id = auth.uid()) WITH CHECK (member_id = auth.uid());
CREATE POLICY "demo_showcases_select_all" ON public.demo_day_showcases    FOR SELECT USING (true);
CREATE POLICY "demo_showcases_board_all"  ON public.demo_day_showcases    FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());
CREATE POLICY "demo_votes_select_own"     ON public.demo_day_votes        FOR SELECT USING (member_id = auth.uid());
CREATE POLICY "demo_votes_all_own"        ON public.demo_day_votes        FOR ALL USING (member_id = auth.uid()) WITH CHECK (member_id = auth.uid());
CREATE POLICY "email_digest_board_all"    ON public.email_digest_queue    FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());
