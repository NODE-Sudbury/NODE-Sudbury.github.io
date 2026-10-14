-- NODE Events Platform
-- Migration: Full registration system (additive - existing rsvps table kept as-is)
-- Generated: 2026-08-29

-- ============================================================
-- Ticket types
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ticket_types (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id                  uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name                      text NOT NULL,
  description               text,
  pricing_model             ticket_pricing_model NOT NULL DEFAULT 'free',
  price_cents               integer NOT NULL DEFAULT 0 CONSTRAINT chk_price_cents_positive CHECK (price_cents >= 0),
  quantity_available        integer,
  quantity_sold             integer NOT NULL DEFAULT 0,
  refundable_deposit_cents  integer NOT NULL DEFAULT 0,
  cancellation_window_hours integer NOT NULL DEFAULT 48,
  is_active                 boolean NOT NULL DEFAULT true,
  created_at                timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Promo codes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       uuid REFERENCES public.events(id) ON DELETE CASCADE,
  code           text NOT NULL UNIQUE,
  discount_cents integer NOT NULL DEFAULT 0,
  max_uses       integer,
  used_count     integer NOT NULL DEFAULT 0,
  expires_at     timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Full registrations table (new, separate from legacy rsvps)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.registrations (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id                   uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  member_id                  uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  ticket_type_id             uuid REFERENCES public.ticket_types(id) ON DELETE SET NULL,
  status                     registration_status NOT NULL DEFAULT 'confirmed',
  waitlist_position          integer,
  checked_in_at              timestamptz,
  amount_paid_cents          integer NOT NULL DEFAULT 0 CONSTRAINT chk_amount_paid_cents_positive CHECK (amount_paid_cents >= 0),
  attendance_mode            text NOT NULL DEFAULT 'in_person',
  looking_for_team           boolean NOT NULL DEFAULT false,
  group_size                 smallint NOT NULL DEFAULT 1,
  promo_code_id              uuid REFERENCES public.promo_codes(id) ON DELETE SET NULL,
  discount_applied_cents     integer NOT NULL DEFAULT 0,
  stripe_checkout_session_id text,
  parent_registration_id     uuid REFERENCES public.registrations(id) ON DELETE SET NULL,
  deposit_returned_at        timestamptz,
  deposit_forfeited_at       timestamptz,
  utm_source                 text,
  utm_medium                 text,
  utm_campaign               text,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, member_id)
);

-- ============================================================
-- Waitlist promotions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.waitlist_promotions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  promoted_at     timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz
);

-- ============================================================
-- Registration custom questions / answers
-- ============================================================
CREATE TABLE IF NOT EXISTS public.registration_custom_questions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  question    text NOT NULL,
  is_required boolean NOT NULL DEFAULT false,
  sort_order  smallint NOT NULL DEFAULT 0,
  answers     jsonb NOT NULL DEFAULT '{}'
);

-- ============================================================
-- Event check-in sessions (board-managed check-in window)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.event_check_in_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  opened_by   uuid REFERENCES public.members(id) ON DELETE SET NULL,
  opened_at   timestamptz NOT NULL DEFAULT now(),
  closed_at   timestamptz
);

-- ============================================================
-- Offline check-in queue (tablet sync before connectivity)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.offline_check_in_queue (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_session_id uuid NOT NULL REFERENCES public.event_check_in_sessions(id) ON DELETE CASCADE,
  registration_id uuid REFERENCES public.registrations(id) ON DELETE SET NULL,
  scanned_code    text NOT NULL,
  scanned_at      timestamptz NOT NULL DEFAULT now(),
  synced          boolean NOT NULL DEFAULT false
);

-- ============================================================
-- Event invites
-- ============================================================
CREATE TABLE IF NOT EXISTS public.event_invites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  invited_by  uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  email       text NOT NULL,
  token       text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  accepted_at timestamptz,
  expires_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Referral codes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id  uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  code       text NOT NULL UNIQUE DEFAULT upper(encode(gen_random_bytes(5), 'hex')),
  uses       integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.referral_uses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id         uuid NOT NULL REFERENCES public.referral_codes(id) ON DELETE CASCADE,
  referred_member uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  registration_id uuid REFERENCES public.registrations(id) ON DELETE SET NULL,
  used_at         timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Stripe integration
-- ============================================================
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text NOT NULL UNIQUE,
  event_type      text NOT NULL,
  payload         jsonb NOT NULL,
  processed       boolean NOT NULL DEFAULT false,
  received_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payment_refunds (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  amount_cents    integer NOT NULL CONSTRAINT chk_refund_amount_positive CHECK (amount_cents >= 0),
  stripe_refund_id text,
  reason          text,
  refunded_at     timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Series subscriptions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.series_subscriptions (
  series_id  uuid NOT NULL REFERENCES public.event_series(id) ON DELETE CASCADE,
  member_id  uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (series_id, member_id)
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_ticket_types_event     ON public.ticket_types(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_event    ON public.registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_member   ON public.registrations(member_id);
CREATE INDEX IF NOT EXISTS idx_registrations_status   ON public.registrations(status);
CREATE INDEX IF NOT EXISTS idx_registrations_stripe   ON public.registrations(stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_promo_codes_code       ON public.promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_event_invites_token    ON public.event_invites(token);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code    ON public.referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_stripe_events_id       ON public.stripe_webhook_events(stripe_event_id);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.ticket_types               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist_promotions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_custom_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_check_in_sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offline_check_in_queue     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_invites              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_codes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_uses              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_webhook_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_refunds            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series_subscriptions       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ticket_types_select_all"    ON public.ticket_types           FOR SELECT USING (true);
CREATE POLICY "promo_codes_select_board"   ON public.promo_codes            FOR SELECT USING (public.is_board());
CREATE POLICY "regs_select_own"            ON public.registrations          FOR SELECT USING (member_id = auth.uid() OR public.is_board());
CREATE POLICY "regs_insert_own"            ON public.registrations          FOR INSERT WITH CHECK (member_id = auth.uid());
CREATE POLICY "regs_update_own"            ON public.registrations          FOR UPDATE USING (member_id = auth.uid());
CREATE POLICY "regs_board_all"             ON public.registrations          FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());
CREATE POLICY "wl_select_own"              ON public.waitlist_promotions    FOR SELECT USING (EXISTS (SELECT 1 FROM public.registrations r WHERE r.id = registration_id AND r.member_id = auth.uid()));
CREATE POLICY "regq_select_all"            ON public.registration_custom_questions FOR SELECT USING (true);
CREATE POLICY "checkin_ses_select_board"   ON public.event_check_in_sessions FOR SELECT USING (public.is_board() OR public.current_user_role() = 'checkin');
CREATE POLICY "offline_ci_select_board"    ON public.offline_check_in_queue  FOR SELECT USING (public.is_board() OR public.current_user_role() = 'checkin');
CREATE POLICY "invites_select_own"         ON public.event_invites          FOR SELECT USING (invited_by = auth.uid() OR public.is_board());
CREATE POLICY "refcodes_select_own"        ON public.referral_codes         FOR SELECT USING (member_id = auth.uid());
CREATE POLICY "refuses_select_own"         ON public.referral_uses          FOR SELECT USING (EXISTS (SELECT 1 FROM public.referral_codes rc WHERE rc.id = code_id AND rc.member_id = auth.uid()));
CREATE POLICY "stripe_events_board_all"    ON public.stripe_webhook_events  FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());
CREATE POLICY "refunds_select_own"         ON public.payment_refunds        FOR SELECT USING (EXISTS (SELECT 1 FROM public.registrations r WHERE r.id = registration_id AND r.member_id = auth.uid()) OR public.is_board());
CREATE POLICY "series_subs_select_own"     ON public.series_subscriptions   FOR SELECT USING (member_id = auth.uid());
CREATE POLICY "series_subs_insert_own"     ON public.series_subscriptions   FOR INSERT WITH CHECK (member_id = auth.uid());
CREATE POLICY "series_subs_delete_own"     ON public.series_subscriptions   FOR DELETE USING (member_id = auth.uid());

-- Board manages
CREATE POLICY "ticket_types_board_all"    ON public.ticket_types            FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());
CREATE POLICY "promo_codes_board_all"     ON public.promo_codes             FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());
CREATE POLICY "checkin_ses_board_all"     ON public.event_check_in_sessions FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());
CREATE POLICY "invites_board_all"         ON public.event_invites           FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());
