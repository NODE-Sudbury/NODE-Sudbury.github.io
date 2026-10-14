-- Event series: groups recurring events such as Norcat monthly sessions.

CREATE TABLE public.event_series (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  description text,
  slug        text NOT NULL UNIQUE,
  banner_url  text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.event_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_series_select_all"
  ON public.event_series FOR SELECT
  USING (true);

CREATE TRIGGER event_series_set_updated_at
  BEFORE UPDATE ON public.event_series
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_event_series_slug ON public.event_series(slug);
