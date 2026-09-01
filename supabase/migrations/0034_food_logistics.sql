-- Food & Logistics support (section AR)
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS dietary_restrictions text[] DEFAULT '{}';
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS tshirt_size text;

ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS dietary_notes text[] DEFAULT '{}';
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS tshirt_size text;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS accessibility_needs text;

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS collect_dietary boolean NOT NULL DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS collect_tshirt_size boolean NOT NULL DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS collect_accessibility boolean NOT NULL DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS meal_notes text;
