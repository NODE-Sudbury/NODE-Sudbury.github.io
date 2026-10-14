-- Post-event pipeline: recording/photos/recap links on events,
-- feedback survey table, and attendance export log.

-- ── Post-event link columns on events ──────────────────────────
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS recording_url text,
  ADD COLUMN IF NOT EXISTS photos_url    text,
  ADD COLUMN IF NOT EXISTS recap_url     text;

-- ── Event feedback ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.event_feedback (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id           uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  member_id          uuid REFERENCES public.members(id) ON DELETE SET NULL,
  nps_score          smallint CHECK (nps_score BETWEEN 0 AND 10),
  overall_rating     smallint CHECK (overall_rating BETWEEN 1 AND 5),
  what_went_well     text,
  what_could_improve text,
  would_attend_again boolean,
  submitted_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_event_feedback_event ON public.event_feedback (event_id);

ALTER TABLE public.event_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feedback_insert_own" ON public.event_feedback
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT id FROM public.members WHERE id = member_id LIMIT 1)
  );

CREATE POLICY "feedback_select_own" ON public.event_feedback
  FOR SELECT USING (
    auth.uid() = (SELECT id FROM public.members WHERE id = member_id LIMIT 1)
  );

CREATE POLICY "feedback_select_board" ON public.event_feedback
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.members WHERE id = auth.uid() AND role = 'board')
  );

-- ── Attendance export log ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.event_attendance_exports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  exported_by uuid NOT NULL REFERENCES public.members(id),
  exported_at timestamptz NOT NULL DEFAULT now(),
  row_count   integer
);

ALTER TABLE public.event_attendance_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exports_select_board" ON public.event_attendance_exports
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.members WHERE id = auth.uid() AND role = 'board'));

CREATE POLICY "exports_insert_board" ON public.event_attendance_exports
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.members WHERE id = auth.uid() AND role = 'board'));
