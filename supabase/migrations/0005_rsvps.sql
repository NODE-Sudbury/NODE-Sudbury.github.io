-- RSVPs: tracks member attendance for events.
-- Supports waitlist and check-in.

CREATE TABLE public.rsvps (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id          uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  member_id         uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,

  status            text NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'waitlisted', 'cancelled')),

  waitlist_position integer,
  checked_in_at     timestamptz,

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  UNIQUE (event_id, member_id)
);

ALTER TABLE public.rsvps ENABLE ROW LEVEL SECURITY;

-- Members can see their own RSVPs
CREATE POLICY "rsvps_select_own"
  ON public.rsvps FOR SELECT
  USING (auth.uid() = member_id);

-- Members can insert/update/delete their own RSVPs
CREATE POLICY "rsvps_insert_own"
  ON public.rsvps FOR INSERT
  WITH CHECK (auth.uid() = member_id);

CREATE POLICY "rsvps_update_own"
  ON public.rsvps FOR UPDATE
  USING (auth.uid() = member_id);

CREATE POLICY "rsvps_delete_own"
  ON public.rsvps FOR DELETE
  USING (auth.uid() = member_id);

CREATE TRIGGER rsvps_set_updated_at
  BEFORE UPDATE ON public.rsvps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_rsvps_event    ON public.rsvps(event_id);
CREATE INDEX idx_rsvps_member   ON public.rsvps(member_id);
CREATE INDEX idx_rsvps_status   ON public.rsvps(status);
