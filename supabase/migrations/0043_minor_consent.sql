-- ============================================================
-- Minor Consent Flow (BJ)
-- ============================================================

-- Members: date of birth + computed minor flag
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS is_minor boolean GENERATED ALWAYS AS (
  date_of_birth IS NOT NULL AND date_of_birth > CURRENT_DATE - INTERVAL '18 years'
) STORED;

-- Events: minor consent settings
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS requires_minor_consent boolean NOT NULL DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS min_age integer;

-- Extend existing minor_consent_records with token-based flow columns
ALTER TABLE public.minor_consent_records ADD COLUMN IF NOT EXISTS registration_id uuid REFERENCES public.registrations(id) ON DELETE CASCADE;
ALTER TABLE public.minor_consent_records ADD COLUMN IF NOT EXISTS guardian_phone text;
ALTER TABLE public.minor_consent_records ADD COLUMN IF NOT EXISTS relationship text NOT NULL DEFAULT 'parent';
ALTER TABLE public.minor_consent_records ADD COLUMN IF NOT EXISTS consent_given boolean NOT NULL DEFAULT false;
ALTER TABLE public.minor_consent_records ADD COLUMN IF NOT EXISTS consent_token text UNIQUE;
ALTER TABLE public.minor_consent_records ADD COLUMN IF NOT EXISTS consented_at timestamptz;

-- Update RLS
CREATE POLICY IF NOT EXISTS "Members insert own consent" ON public.minor_consent_records
  FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM public.members WHERE id = member_id));

CREATE POLICY IF NOT EXISTS "Members view own consent" ON public.minor_consent_records
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.members WHERE id = member_id));

-- Index for token lookups (public guardian page)
CREATE INDEX IF NOT EXISTS idx_minor_consent_token ON public.minor_consent_records (consent_token);
CREATE INDEX IF NOT EXISTS idx_minor_consent_registration ON public.minor_consent_records (registration_id);
