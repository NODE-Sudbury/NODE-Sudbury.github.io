-- Partners: sponsors and community partners of NODE Sudbury.

CREATE TABLE public.partners (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  logo_url      text,
  website_url   text,
  description   text,
  tier          text NOT NULL DEFAULT 'community'
    CHECK (tier IN ('platinum', 'gold', 'silver', 'community')),
  display_order integer NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partners_select_active"
  ON public.partners FOR SELECT
  USING (is_active = true);

CREATE TRIGGER partners_set_updated_at
  BEFORE UPDATE ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_partners_tier   ON public.partners(tier);
CREATE INDEX idx_partners_active ON public.partners(is_active);
CREATE INDEX idx_partners_order  ON public.partners(display_order);
