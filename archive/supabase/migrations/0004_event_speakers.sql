-- Event speakers: links events to member profiles or external speaker info.

CREATE TABLE public.event_speakers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  member_id   uuid REFERENCES public.members(id) ON DELETE SET NULL,

  -- fallback for external speakers not in members table
  name        text,
  bio         text,
  photo_url   text,
  topic       text,
  display_order integer NOT NULL DEFAULT 0,

  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.event_speakers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_speakers_select_all"
  ON public.event_speakers FOR SELECT
  USING (true);

CREATE INDEX idx_event_speakers_event   ON public.event_speakers(event_id);
CREATE INDEX idx_event_speakers_member  ON public.event_speakers(member_id);
