-- Job Fair Extended: listings, meetings, additional booth fields
ALTER TABLE public.job_fair_booths ADD COLUMN IF NOT EXISTS website_url text;
ALTER TABLE public.job_fair_booths ADD COLUMN IF NOT EXISTS industries text[] DEFAULT '{}';
ALTER TABLE public.job_fair_booths ADD COLUMN IF NOT EXISTS contact_name text;
ALTER TABLE public.job_fair_booths ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE public.job_fair_booths ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'confirmed';

CREATE TABLE IF NOT EXISTS public.job_fair_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booth_id uuid NOT NULL REFERENCES public.job_fair_booths(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title text NOT NULL,
  employment_type text DEFAULT 'full_time',
  location_type text DEFAULT 'hybrid',
  description text,
  salary_range text,
  apply_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.job_fair_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booth_id uuid NOT NULL REFERENCES public.job_fair_booths(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  time_slot text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'requested',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booth_id, time_slot)
);

ALTER TABLE public.job_fair_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_fair_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "jf_listings_select_all" ON public.job_fair_listings FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "jf_listings_board_all" ON public.job_fair_listings FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());
CREATE POLICY IF NOT EXISTS "jf_meetings_select_own" ON public.job_fair_meetings FOR SELECT USING (member_id = (SELECT id FROM public.members WHERE user_id = auth.uid() LIMIT 1) OR public.is_board());
CREATE POLICY IF NOT EXISTS "jf_meetings_insert_own" ON public.job_fair_meetings FOR INSERT WITH CHECK (member_id = (SELECT id FROM public.members WHERE user_id = auth.uid() LIMIT 1));
CREATE POLICY IF NOT EXISTS "jf_meetings_update_own" ON public.job_fair_meetings FOR UPDATE USING (member_id = (SELECT id FROM public.members WHERE user_id = auth.uid() LIMIT 1));
CREATE POLICY IF NOT EXISTS "jf_meetings_board_all" ON public.job_fair_meetings FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());

CREATE INDEX IF NOT EXISTS idx_jf_listings_booth ON public.job_fair_listings(booth_id);
CREATE INDEX IF NOT EXISTS idx_jf_meetings_booth ON public.job_fair_meetings(booth_id);
CREATE INDEX IF NOT EXISTS idx_jf_meetings_member ON public.job_fair_meetings(member_id);
