-- ============================================================
-- NODE Events Platform - Dev/Test Seed Data
-- ============================================================
-- Safe to re-run (all inserts use ON CONFLICT DO NOTHING).
-- Do NOT run against production.
--
-- Apply: psql $SUPABASE_DEV_DB_URL -f supabase/seed/seed.sql
--
-- Member rows are NOT seeded here. Real member rows are
-- created automatically on first login via handle_new_user().
-- ============================================================

-- ============================================================
-- 1. Chapter
-- ============================================================
INSERT INTO public.chapters (id, name, city, province, country, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'NODE Sudbury',
  'Greater Sudbury',
  'ON',
  'CA',
  true
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. Feature flags
-- ============================================================
INSERT INTO public.feature_flags (key, enabled, description)
VALUES
  ('hackathon_enabled',          true,  'Enable hackathon features (teams, submissions, judging)'),
  ('cfp_enabled',                true,  'Enable call-for-proposals submissions'),
  ('quiz_enabled',               false, 'Enable realtime quiz rooms (not yet launched)'),
  ('networking_enabled',         true,  'Enable member networking opt-in and connections'),
  ('push_notifications_enabled', false, 'Enable Web Push notifications (VAPID)')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 3. Event locations
-- ============================================================
INSERT INTO public.event_locations (id, name, address, city, province, postal_code, country, is_virtual)
VALUES
  (
    '00000000-0000-0000-0000-000000000010',
    'Laurentian University',
    '935 Ramsey Lake Rd',
    'Greater Sudbury', 'ON', 'P3E 2C6', 'CA', false
  ),
  (
    '00000000-0000-0000-0000-000000000011',
    'NORCAT Innovation Centre',
    '1545 Ramsay Lake Rd',
    'Greater Sudbury', 'ON', 'P3E 6S5', 'CA', false
  ),
  (
    '00000000-0000-0000-0000-000000000012',
    'Online (Virtual)',
    null,
    'Greater Sudbury', 'ON', null, 'CA', true
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 4. Event series
-- ============================================================
INSERT INTO public.event_series (id, chapter_id, title, slug, description, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000020',
  '00000000-0000-0000-0000-000000000001',
  'NORCAT Sessions',
  'norcat-sessions',
  'Monthly NODE x NORCAT entrepreneur spotlight series',
  true
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 5. Event tags
-- ============================================================
INSERT INTO public.event_tags (id, name, color)
VALUES
  ('00000000-0000-0000-0000-000000000030', 'AI/ML',       '#7aa2f7'),
  ('00000000-0000-0000-0000-000000000031', 'Web Dev',     '#9ece6a'),
  ('00000000-0000-0000-0000-000000000032', 'Cloud',       '#73daca'),
  ('00000000-0000-0000-0000-000000000033', 'Security',    '#f7768e'),
  ('00000000-0000-0000-0000-000000000034', 'Open Source', '#e0af68'),
  ('00000000-0000-0000-0000-000000000035', 'Hardware',    '#bb9af7'),
  ('00000000-0000-0000-0000-000000000036', 'Game Dev',    '#fab387'),
  ('00000000-0000-0000-0000-000000000037', 'Data',        '#7aa2f7'),
  ('00000000-0000-0000-0000-000000000038', 'Career',      '#e0af68'),
  ('00000000-0000-0000-0000-000000000039', 'Community',   '#9ece6a')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 6. Events (3 sample events)
-- ============================================================
INSERT INTO public.events (
  id, chapter_id, title, slug, description,
  type, status, location_id,
  starts_at, ends_at,
  max_capacity
)
VALUES
  (
    '00000000-0000-0000-0000-000000000040',
    '00000000-0000-0000-0000-000000000001',
    'NODE Sudbury April Meetup',
    'node-sudbury-april-2026',
    'Monthly tech community meetup. Networking, lightning talks, and demos from local builders.',
    'meetup', 'archived',
    '00000000-0000-0000-0000-000000000011',
    '2026-04-22 18:00:00-04', '2026-04-22 20:30:00-04',
    80
  ),
  (
    '00000000-0000-0000-0000-000000000041',
    '00000000-0000-0000-0000-000000000001',
    'Intro to Supabase - Build a Full-Stack App in 90 Minutes',
    'intro-supabase-sep-2026',
    'Hands-on workshop covering Supabase Auth, Postgres RLS, and Realtime. Bring a laptop.',
    'workshop', 'published',
    '00000000-0000-0000-0000-000000000010',
    '2026-09-18 18:00:00-04', '2026-09-18 20:00:00-04',
    40
  ),
  (
    '00000000-0000-0000-0000-000000000042',
    '00000000-0000-0000-0000-000000000001',
    'NODE Hackathon 2026',
    'node-hackathon-2026',
    '24-hour hackathon open to all skill levels. Build something that matters for Northern Ontario.',
    'hackathon', 'draft',
    '00000000-0000-0000-0000-000000000011',
    '2026-10-25 09:00:00-04', '2026-10-26 12:00:00-04',
    120
  )
ON CONFLICT (id) DO NOTHING;

-- Tag links
INSERT INTO public.event_tag_links (event_id, tag_id)
VALUES
  ('00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000031'),
  ('00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000032'),
  ('00000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000031'),
  ('00000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000039')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 7. Ticket types (one free ticket per event)
-- ============================================================
INSERT INTO public.ticket_types (id, event_id, name, description, pricing_model, price_cents, quantity_available, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000050', '00000000-0000-0000-0000-000000000040', 'General Admission', 'Free entry to the April meetup.',            'free', 0, 80,  true),
  ('00000000-0000-0000-0000-000000000051', '00000000-0000-0000-0000-000000000041', 'Workshop Seat',     'Free seat at the Supabase workshop.',        'free', 0, 40,  true),
  ('00000000-0000-0000-0000-000000000052', '00000000-0000-0000-0000-000000000042', 'Hacker Pass',       'Full 24-hour hackathon access with meals.',  'free', 0, 120, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 8. Badge definitions
-- ============================================================
INSERT INTO public.badge_definitions (id, name, description, trigger, points, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000060', 'First Event',        'Attended your first NODE event.',                           'first_event',    50,  true),
  ('00000000-0000-0000-0000-000000000061', 'Hackathon Finalist', 'Placed in the top teams at a NODE Hackathon.',              'hackathon_win',  200, true),
  ('00000000-0000-0000-0000-000000000062', 'Speaker',            'Gave a talk or demo at a NODE event.',                      'speaker',        150, true),
  ('00000000-0000-0000-0000-000000000063', 'Volunteer',          'Volunteered to help run a NODE event.',                     'volunteer',      100, true),
  ('00000000-0000-0000-0000-000000000064', 'Mentor',             'Registered as a mentor and completed at least one session.','mentor',         125, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 9. Promo code
-- ============================================================
INSERT INTO public.promo_codes (id, event_id, code, discount_cents, max_uses, expires_at)
VALUES (
  '00000000-0000-0000-0000-000000000080',
  null,
  'NODE2026',
  0,
  5,
  '2026-12-31 23:59:59+00'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Legacy seed data (backwards compat with 0001-0015)
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.partners WHERE name = 'NORCAT') THEN
    INSERT INTO public.partners (name, website_url, tier, display_order) VALUES ('NORCAT', 'https://norcat.ca', 'platinum', 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.partners WHERE name = 'City of Greater Sudbury') THEN
    INSERT INTO public.partners (name, website_url, tier, display_order) VALUES ('City of Greater Sudbury', 'https://www.greatersudbury.ca', 'gold', 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.partners WHERE name = 'Laurentian University') THEN
    INSERT INTO public.partners (name, website_url, tier, display_order) VALUES ('Laurentian University', 'https://laurentian.ca', 'gold', 3);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.board_members WHERE name = 'NODE Sudbury Chair') THEN
    INSERT INTO public.board_members (name, role, display_order, is_active)
    VALUES ('NODE Sudbury Chair', 'Chair', 1, true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.board_members WHERE name = 'NODE Sudbury Director') THEN
    INSERT INTO public.board_members (name, role, display_order, is_active)
    VALUES ('NODE Sudbury Director', 'Director', 2, true);
  END IF;
END $$;
