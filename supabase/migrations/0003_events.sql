-- Events table: covers all NODE events including Norcat series sessions.
-- For recurring series, set series_id + session_number.

CREATE TABLE public.events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL,
  slug            text NOT NULL UNIQUE,
  description     text,
  location        text,
  online_link     text,
  banner_url      text,

  starts_at       timestamptz NOT NULL,
  ends_at         timestamptz,

  -- recurring series support (nullable for one-off events)
  series_id       uuid REFERENCES public.event_series(id) ON DELETE SET NULL,
  session_number  integer,

  max_capacity    integer,
  is_published    boolean NOT NULL DEFAULT false,
  is_cancelled    boolean NOT NULL DEFAULT false,

  created_by      uuid REFERENCES public.members(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Published, non-cancelled events are publicly visible
CREATE POLICY "events_select_published"
  ON public.events FOR SELECT
  USING (is_published = true AND is_cancelled = false);

CREATE TRIGGER events_set_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_events_slug         ON public.events(slug);
CREATE INDEX idx_events_starts_at    ON public.events(starts_at);
CREATE INDEX idx_events_series_id    ON public.events(series_id);
CREATE INDEX idx_events_is_published ON public.events(is_published);
