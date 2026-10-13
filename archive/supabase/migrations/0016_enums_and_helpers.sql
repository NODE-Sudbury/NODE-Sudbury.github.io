-- NODE Events Platform
-- Migration: Enum types and helper functions (additive on top of 0001-0015)
-- Generated: 2026-08-29

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_role') THEN
    CREATE TYPE member_role AS ENUM ('member', 'checkin', 'board', 'admin');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_type_enum') THEN
    CREATE TYPE member_type_enum AS ENUM ('student', 'professional', 'other');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_type') THEN
    CREATE TYPE event_type AS ENUM (
      'meetup','workshop','hackathon','conference','multi_track',
      'norcat_series','unconference','study_group','demo_day',
      'game_jam','job_fair','competition_ctf','competition_prog','async_event'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_status') THEN
    CREATE TYPE event_status AS ENUM (
      'draft','published','unlisted','private','cancelled','postponed','archived'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'registration_status') THEN
    CREATE TYPE registration_status AS ENUM (
      'pending_consent','pending_payment','confirmed',
      'waitlisted','cancelled','attended','no_show'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_pricing_model') THEN
    CREATE TYPE ticket_pricing_model AS ENUM ('free','paid','donation','member_only');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'volunteer_status') THEN
    CREATE TYPE volunteer_status AS ENUM ('applied','approved','rejected','checked_in');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cfp_status') THEN
    CREATE TYPE cfp_status AS ENUM ('submitted','under_review','accepted','rejected','withdrawn');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'badge_trigger') THEN
    CREATE TYPE badge_trigger AS ENUM (
      'manual','attendance_streak','first_event','hackathon_win',
      'ctf_solve','volunteer','speaker','mentor','referral'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notif_channel') THEN
    CREATE TYPE notif_channel AS ENUM ('in_app','push','email');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'moderation_action') THEN
    CREATE TYPE moderation_action AS ENUM ('warning','mute','ban','remove_content');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sponsor_tier') THEN
    CREATE TYPE sponsor_tier AS ENUM ('platinum','gold','silver','bronze','community','in_kind');
  END IF;
END $$;

-- is_board(): true when the calling user has board or admin role
CREATE OR REPLACE FUNCTION public.is_board()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.members WHERE id = auth.uid() AND role IN ('board', 'admin')
  );
$$;

-- touch_updated_at(): generic BEFORE UPDATE trigger to set updated_at = now()
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;

-- Extend members.member_type check to include 'other' (was only professional/student)
ALTER TABLE public.members DROP CONSTRAINT IF EXISTS members_member_type_check;
ALTER TABLE public.members
  ADD CONSTRAINT members_member_type_check
    CHECK (member_type IN ('professional', 'student', 'other'));
