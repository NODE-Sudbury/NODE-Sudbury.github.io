-- NODE Events Platform
-- Migration: Gamification, notifications, networking, mentorship
-- Generated: 2026-08-29

-- ============================================================
-- Badges
-- ============================================================
CREATE TABLE IF NOT EXISTS public.badge_definitions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  description text,
  icon_url    text,
  trigger     badge_trigger NOT NULL DEFAULT 'manual',
  points      integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.member_badges (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id     uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  badge_id      uuid NOT NULL REFERENCES public.badge_definitions(id) ON DELETE CASCADE,
  awarded_by    uuid REFERENCES public.members(id) ON DELETE SET NULL,
  awarded_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, badge_id)
);

-- ============================================================
-- Point events
-- ============================================================
CREATE TABLE IF NOT EXISTS public.point_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  event_id    uuid REFERENCES public.events(id) ON DELETE SET NULL,
  delta       integer NOT NULL,
  reason      text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Attendance streaks
-- ============================================================
CREATE TABLE IF NOT EXISTS public.attendance_streaks (
  member_id       uuid PRIMARY KEY REFERENCES public.members(id) ON DELETE CASCADE,
  current_streak  integer NOT NULL DEFAULT 0,
  longest_streak  integer NOT NULL DEFAULT 0,
  last_event_date date,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Certificates (Open Badges v3)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.certificate_templates (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  description  text,
  svg_template text,
  badge_class  jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.issued_certificates (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id  uuid NOT NULL REFERENCES public.certificate_templates(id) ON DELETE CASCADE,
  member_id    uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  event_id     uuid REFERENCES public.events(id) ON DELETE SET NULL,
  storage_path text,
  issued_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, member_id, event_id)
);

-- ============================================================
-- Notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  member_id  uuid PRIMARY KEY REFERENCES public.members(id) ON DELETE CASCADE,
  email      boolean NOT NULL DEFAULT true,
  push       boolean NOT NULL DEFAULT false,
  in_app     boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  endpoint    text NOT NULL,
  p256dh      text,
  auth        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_log (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id  uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  channel    notif_channel NOT NULL,
  subject    text,
  body       text NOT NULL,
  sent_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.in_app_notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id  uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  title      text NOT NULL,
  body       text NOT NULL,
  link       text,
  read_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Partial index: only unread rows (95%+ of queries)
CREATE INDEX IF NOT EXISTS idx_notif_unread
  ON public.in_app_notifications (member_id, created_at DESC)
  WHERE read_at IS NULL;

-- ============================================================
-- Networking
-- ============================================================
CREATE TABLE IF NOT EXISTS public.networking_opt_ins (
  event_id   uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  member_id  uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, member_id)
);

CREATE TABLE IF NOT EXISTS public.networking_connections (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Bidirectional unique: (A,B) == (B,A)
CREATE UNIQUE INDEX IF NOT EXISTS idx_networking_conn_unique
  ON public.networking_connections (LEAST(requester_id, recipient_id), GREATEST(requester_id, recipient_id));

-- ============================================================
-- Mentorship
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mentor_registrations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  member_id    uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  expertise    text[],
  max_sessions smallint NOT NULL DEFAULT 2,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, member_id)
);

CREATE TABLE IF NOT EXISTS public.mentor_requests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_reg_id uuid NOT NULL REFERENCES public.mentor_registrations(id) ON DELETE CASCADE,
  mentee_id    uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  topic        text,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','done')),
  scheduled_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mentor_slots (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_reg_id uuid NOT NULL REFERENCES public.mentor_registrations(id) ON DELETE CASCADE,
  starts_at     timestamptz NOT NULL,
  ends_at       timestamptz NOT NULL,
  is_booked     boolean NOT NULL DEFAULT false
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_member_badges_member    ON public.member_badges(member_id);
CREATE INDEX IF NOT EXISTS idx_point_events_member     ON public.point_events(member_id);
CREATE INDEX IF NOT EXISTS idx_issued_certs_member     ON public.issued_certificates(member_id);
CREATE INDEX IF NOT EXISTS idx_in_app_notif_member     ON public.in_app_notifications(member_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_member        ON public.push_subscriptions(member_id);
CREATE INDEX IF NOT EXISTS idx_notif_log_member        ON public.notification_log(member_id);
CREATE INDEX IF NOT EXISTS idx_net_conn_req            ON public.networking_connections(requester_id);
CREATE INDEX IF NOT EXISTS idx_net_conn_rec            ON public.networking_connections(recipient_id);
CREATE INDEX IF NOT EXISTS idx_mentor_regs_event       ON public.mentor_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_mentor_slots_reg        ON public.mentor_slots(mentor_reg_id);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.badge_definitions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_badges            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_events             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_streaks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_templates    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issued_certificates      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.in_app_notifications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.networking_opt_ins       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.networking_connections   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_registrations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_requests          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_slots             ENABLE ROW LEVEL SECURITY;

CREATE POLICY "badges_select_all"        ON public.badge_definitions     FOR SELECT USING (true);
CREATE POLICY "mbadges_select_all"       ON public.member_badges         FOR SELECT USING (true);
CREATE POLICY "points_select_own"        ON public.point_events          FOR SELECT USING (member_id = auth.uid() OR public.is_board());
CREATE POLICY "streaks_select_all"       ON public.attendance_streaks    FOR SELECT USING (true);
CREATE POLICY "cert_tmpl_select_all"     ON public.certificate_templates FOR SELECT USING (true);
CREATE POLICY "issued_certs_select_own"  ON public.issued_certificates   FOR SELECT USING (member_id = auth.uid() OR public.is_board());
CREATE POLICY "notif_pref_select_own"    ON public.notification_preferences FOR SELECT USING (member_id = auth.uid());
CREATE POLICY "notif_pref_upsert_own"    ON public.notification_preferences FOR ALL USING (member_id = auth.uid()) WITH CHECK (member_id = auth.uid());
CREATE POLICY "push_subs_select_own"     ON public.push_subscriptions    FOR SELECT USING (member_id = auth.uid());
CREATE POLICY "push_subs_all_own"        ON public.push_subscriptions    FOR ALL USING (member_id = auth.uid()) WITH CHECK (member_id = auth.uid());
CREATE POLICY "notif_log_select_own"     ON public.notification_log      FOR SELECT USING (member_id = auth.uid());
CREATE POLICY "in_app_notif_select_own"  ON public.in_app_notifications  FOR SELECT USING (member_id = auth.uid());
CREATE POLICY "in_app_notif_update_own"  ON public.in_app_notifications  FOR UPDATE USING (member_id = auth.uid());
CREATE POLICY "net_opt_select_own"       ON public.networking_opt_ins    FOR SELECT USING (member_id = auth.uid());
CREATE POLICY "net_opt_all_own"          ON public.networking_opt_ins    FOR ALL USING (member_id = auth.uid()) WITH CHECK (member_id = auth.uid());
CREATE POLICY "net_conn_select_own"      ON public.networking_connections FOR SELECT USING (requester_id = auth.uid() OR recipient_id = auth.uid());
CREATE POLICY "net_conn_insert_own"      ON public.networking_connections FOR INSERT WITH CHECK (requester_id = auth.uid());
CREATE POLICY "net_conn_update_own"      ON public.networking_connections FOR UPDATE USING (recipient_id = auth.uid());
CREATE POLICY "mentor_reg_select_all"    ON public.mentor_registrations  FOR SELECT USING (true);
CREATE POLICY "mentor_reg_all_own"       ON public.mentor_registrations  FOR ALL USING (member_id = auth.uid()) WITH CHECK (member_id = auth.uid());
CREATE POLICY "mentor_req_select_own"    ON public.mentor_requests       FOR SELECT USING (mentee_id = auth.uid() OR EXISTS (SELECT 1 FROM public.mentor_registrations mr WHERE mr.id = mentor_reg_id AND mr.member_id = auth.uid()));
CREATE POLICY "mentor_req_insert_own"    ON public.mentor_requests       FOR INSERT WITH CHECK (mentee_id = auth.uid());
CREATE POLICY "mentor_slots_select_all"  ON public.mentor_slots          FOR SELECT USING (true);

-- Board manages gamification
CREATE POLICY "badges_board_all"         ON public.badge_definitions     FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());
CREATE POLICY "mbadges_board_all"        ON public.member_badges         FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());
CREATE POLICY "points_board_all"         ON public.point_events          FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());
CREATE POLICY "certs_board_all"          ON public.issued_certificates   FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());
CREATE POLICY "in_app_notif_board_all"   ON public.in_app_notifications  FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());
