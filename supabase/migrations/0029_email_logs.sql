-- ============================================================
-- Email logs - tracks sent emails to prevent duplicates
-- ============================================================
CREATE TABLE IF NOT EXISTS public.email_logs (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id  uuid        REFERENCES public.members(id) ON DELETE SET NULL,
  email      text        NOT NULL,
  email_type text        NOT NULL,
  event_id   uuid        REFERENCES public.events(id) ON DELETE SET NULL,
  sent_at    timestamptz NOT NULL DEFAULT now(),
  metadata   jsonb
);

CREATE INDEX IF NOT EXISTS email_logs_event_type_idx
  ON public.email_logs (event_id, email_type, member_id);

CREATE INDEX IF NOT EXISTS email_logs_sent_at_idx
  ON public.email_logs (sent_at DESC);
