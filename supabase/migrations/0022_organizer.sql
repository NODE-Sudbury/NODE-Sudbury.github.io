-- NODE Events Platform
-- Migration: Organizer domain tables (volunteers, sponsors, moderation, audit, config)
-- Generated: 2026-08-29

-- ============================================================
-- Volunteers
-- ============================================================
CREATE TABLE IF NOT EXISTS public.volunteer_roles (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name           text NOT NULL,
  description    text,
  slots          smallint NOT NULL DEFAULT 1,
  shift_starts_at timestamptz,
  shift_ends_at   timestamptz
);

CREATE TABLE IF NOT EXISTS public.volunteer_applications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id     uuid NOT NULL REFERENCES public.volunteer_roles(id) ON DELETE CASCADE,
  member_id   uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  status      volunteer_status NOT NULL DEFAULT 'applied',
  notes       text,
  applied_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role_id, member_id)
);

CREATE TABLE IF NOT EXISTS public.volunteer_check_ins (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  uuid NOT NULL REFERENCES public.volunteer_applications(id) ON DELETE CASCADE,
  checked_in_at   timestamptz NOT NULL DEFAULT now(),
  checked_in_by   uuid REFERENCES public.members(id) ON DELETE SET NULL
);

-- ============================================================
-- Sponsors (full-featured, separate from legacy partners table)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.event_sponsors (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name        text NOT NULL,
  tier        sponsor_tier NOT NULL DEFAULT 'community',
  logo_url    text,
  website_url text,
  is_active   boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.sponsor_assets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id  uuid NOT NULL REFERENCES public.event_sponsors(id) ON DELETE CASCADE,
  label       text NOT NULL,
  storage_path text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sponsor_portal_invites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id  uuid NOT NULL REFERENCES public.event_sponsors(id) ON DELETE CASCADE,
  email       text NOT NULL,
  token       text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  accepted_by uuid REFERENCES public.members(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  expires_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Moderation
-- ============================================================
CREATE TABLE IF NOT EXISTS public.moderation_flags (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id   uuid REFERENCES public.chapters(id) ON DELETE SET NULL,
  reported_by  uuid REFERENCES public.members(id) ON DELETE SET NULL,
  target_type  text NOT NULL,
  target_id    uuid NOT NULL,
  reason       text NOT NULL,
  notes        text,
  resolved_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.content_bans (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id  uuid REFERENCES public.chapters(id) ON DELETE SET NULL,
  member_id   uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  action      moderation_action NOT NULL,
  reason      text,
  expires_at  timestamptz,
  banned_by   uuid REFERENCES public.members(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Minor consent records (PIPEDA)
-- retain_until set via trigger (set_retain_until) on INSERT
-- ============================================================
CREATE TABLE IF NOT EXISTS public.minor_consent_records (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     uuid NOT NULL REFERENCES public.events(id) ON DELETE RESTRICT,
  member_id    uuid NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
  guardian_name text NOT NULL,
  guardian_email text NOT NULL,
  signed_at    timestamptz NOT NULL DEFAULT now(),
  retain_until date
);

-- ============================================================
-- Member onboarding
-- ============================================================
CREATE TABLE IF NOT EXISTS public.member_onboarding_state (
  member_id    uuid PRIMARY KEY REFERENCES public.members(id) ON DELETE CASCADE,
  step         text NOT NULL DEFAULT 'profile',
  completed_at timestamptz,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Embed widgets
-- ============================================================
CREATE TABLE IF NOT EXISTS public.embed_widget_configs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id  uuid REFERENCES public.chapters(id) ON DELETE CASCADE,
  name        text NOT NULL,
  config      jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- API keys (for embed/external integrations)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.api_keys (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id  uuid REFERENCES public.chapters(id) ON DELETE CASCADE,
  label       text NOT NULL,
  key_hash    text NOT NULL UNIQUE,
  scopes      text[],
  last_used_at timestamptz,
  expires_at  timestamptz,
  created_by  uuid REFERENCES public.members(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Analytics snapshots
-- ============================================================
CREATE TABLE IF NOT EXISTS public.analytics_snapshots (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id   uuid REFERENCES public.chapters(id) ON DELETE SET NULL,
  event_id     uuid REFERENCES public.events(id) ON DELETE SET NULL,
  metric       text NOT NULL,
  value        jsonb NOT NULL,
  snapped_at   timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Audit log
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid REFERENCES public.members(id) ON DELETE SET NULL,
  action      text NOT NULL,
  target_type text,
  target_id   uuid,
  diff        jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Feature flags
-- ============================================================
CREATE TABLE IF NOT EXISTS public.feature_flags (
  key         text PRIMARY KEY,
  enabled     boolean NOT NULL DEFAULT false,
  description text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_vol_apps_role     ON public.volunteer_applications(role_id);
CREATE INDEX IF NOT EXISTS idx_vol_apps_member   ON public.volunteer_applications(member_id);
CREATE INDEX IF NOT EXISTS idx_sponsors_event    ON public.event_sponsors(event_id);
CREATE INDEX IF NOT EXISTS idx_modflag_target    ON public.moderation_flags(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_bans_member       ON public.content_bans(member_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor       ON public.audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_target      ON public.audit_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_created     ON public.audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_event   ON public.analytics_snapshots(event_id);
CREATE INDEX IF NOT EXISTS idx_minor_consent_event ON public.minor_consent_records(event_id);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.volunteer_roles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_applications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_check_ins      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_sponsors           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_assets           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_portal_invites   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_flags         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_bans             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.minor_consent_records    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_onboarding_state  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embed_widget_configs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_snapshots      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags            ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vol_roles_select_all"      ON public.volunteer_roles        FOR SELECT USING (true);
CREATE POLICY "vol_apps_select_own"       ON public.volunteer_applications  FOR SELECT USING (member_id = auth.uid() OR public.is_board());
CREATE POLICY "vol_apps_insert_own"       ON public.volunteer_applications  FOR INSERT WITH CHECK (member_id = auth.uid());
CREATE POLICY "vol_apps_board_all"        ON public.volunteer_applications  FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());
CREATE POLICY "vol_checkin_select_board"  ON public.volunteer_check_ins    FOR SELECT USING (public.is_board());
CREATE POLICY "sponsors_select_all"       ON public.event_sponsors         FOR SELECT USING (true);
CREATE POLICY "sponsors_board_all"        ON public.event_sponsors         FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());
CREATE POLICY "sassets_select_all"        ON public.sponsor_assets         FOR SELECT USING (true);
CREATE POLICY "sassets_board_all"         ON public.sponsor_assets         FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());
CREATE POLICY "spinvites_board_all"       ON public.sponsor_portal_invites FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());
CREATE POLICY "modflag_insert_auth"       ON public.moderation_flags       FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "modflag_select_board"      ON public.moderation_flags       FOR SELECT USING (public.is_board());
CREATE POLICY "bans_select_board"         ON public.content_bans           FOR SELECT USING (public.is_board());
CREATE POLICY "bans_board_all"            ON public.content_bans           FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());
CREATE POLICY "minor_consent_select_board" ON public.minor_consent_records FOR SELECT USING (public.is_board());
CREATE POLICY "minor_consent_insert_own"  ON public.minor_consent_records  FOR INSERT WITH CHECK (member_id = auth.uid());
CREATE POLICY "onboarding_own"            ON public.member_onboarding_state FOR ALL USING (member_id = auth.uid()) WITH CHECK (member_id = auth.uid());
CREATE POLICY "embed_configs_select_all"  ON public.embed_widget_configs   FOR SELECT USING (true);
CREATE POLICY "embed_configs_board_all"   ON public.embed_widget_configs   FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());
CREATE POLICY "apikeys_board_all"         ON public.api_keys               FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());
CREATE POLICY "analytics_board_all"       ON public.analytics_snapshots    FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());
CREATE POLICY "audit_log_select_board"    ON public.audit_log              FOR SELECT USING (public.is_board());
CREATE POLICY "feature_flags_select_all"  ON public.feature_flags          FOR SELECT USING (true);
CREATE POLICY "feature_flags_board_all"   ON public.feature_flags          FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());

-- Vol roles managed by board
CREATE POLICY "vol_roles_board_all"       ON public.volunteer_roles        FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());
