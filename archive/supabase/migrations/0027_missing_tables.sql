-- NODE Events Platform
-- Migration: Missing tables patch (session_check_ins)
-- Generated: 2026-08-29
-- Note: Only 1 table was missing from the 0016-0026 migrations.
--       The "130" count in the schema artifact included views and
--       legacy tables (rsvps, board_members, event_speakers, partners,
--       admins, settings) from the original 0001-0015 migrations.

-- Per-session attendance for multi-track events
CREATE TABLE IF NOT EXISTS public.session_check_ins (
  event_session_id uuid NOT NULL REFERENCES public.event_sessions(id) ON DELETE CASCADE,
  registration_id  uuid NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  checked_in_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_session_id, registration_id)
);

ALTER TABLE public.session_check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sci_checkin"
  ON public.session_check_ins FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE id = auth.uid()
        AND role IN ('checkin', 'board', 'admin')
    )
  );
