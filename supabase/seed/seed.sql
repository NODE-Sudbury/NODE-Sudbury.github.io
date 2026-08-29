-- Seed data for local dev and testing (run after migrations)

-- Event series: Norcat monthly sessions
INSERT INTO public.event_series (id, title, slug, description, is_active)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Norcat Sessions',
  'norcat-sessions',
  'Monthly NODE x Norcat entrepreneur spotlight series',
  true
);

-- Partners
INSERT INTO public.partners (name, logo_url, website_url, tier, display_order)
VALUES
  ('Norcat', null, 'https://norcat.ca', 'platinum', 1),
  ('City of Greater Sudbury', null, 'https://www.greatersudbury.ca', 'gold', 2),
  ('Laurentian University', null, 'https://laurentian.ca', 'gold', 3);

-- Board members (no member_id - pre-SSO placeholders)
INSERT INTO public.board_members (name, role, display_order, is_active)
VALUES
  ('NODE Sudbury Chair', 'Chair', 1, true),
  ('NODE Sudbury Director', 'Director', 2, true);

-- Sample upcoming event (Norcat session 1)
INSERT INTO public.events (
  id, title, slug, description, location,
  starts_at, series_id, session_number, is_published
)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'Norcat Sessions - September 2026',
  'norcat-sessions-sept-2026',
  'Monthly entrepreneur spotlight at Norcat Innovation Centre',
  'Norcat Innovation Centre, Sudbury ON',
  '2026-09-15 18:00:00+00',
  '11111111-1111-1111-1111-111111111111',
  1,
  true
);
