-- Add interests array to members (onboarding_state table already exists from 0022)
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS interests text[] DEFAULT '{}';
