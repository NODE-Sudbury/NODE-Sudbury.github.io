-- NODE Events Platform
-- Migration: Foundation tables (chapters, locations, tags, tracks, sessions, templates)
--            + ALTER existing tables to add new columns
-- Generated: 2026-08-29

-- ============================================================
-- NEW TABLE: chapters
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chapters (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  city         text,
  province     text,
  country      text NOT NULL DEFAULT 'Canada',
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chapters_select_all" ON public.chapters FOR SELECT USING (true);

-- Seed default chapter
INSERT INTO public.chapters (name, city, province)
VALUES ('NODE Sudbury', 'Sudbury', 'Ontario')
ON CONFLICT DO NOTHING;

-- ============================================================
-- ALTER: members - add missing columns
-- ============================================================
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS chapter_id   uuid REFERENCES public.chapters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS bio          text,
  ADD COLUMN IF NOT EXISTS pronouns     text,
  ADD COLUMN IF NOT EXISTS skills       text[],
  ADD COLUMN IF NOT EXISTS total_points integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_members_chapter ON public.members(chapter_id);

-- ============================================================
-- NEW TABLE: event_locations
-- ============================================================
CREATE TABLE IF NOT EXISTS public.event_locations (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 text NOT NULL,
  address              text,
  city                 text,
  province             text,
  country              text NOT NULL DEFAULT 'Canada',
  postal_code          text,
  lat                  numeric,
  lng                  numeric,
  is_virtual           boolean NOT NULL DEFAULT false,
  capacity             integer,
  accessibility_notes  text,
  parking_notes        text,
  virtual_platform     text,
  join_link_visibility text NOT NULL DEFAULT 'registered'
);

ALTER TABLE public.event_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "locations_select_all" ON public.event_locations FOR SELECT USING (true);

-- ============================================================
-- ALTER: event_series - add missing columns
-- ============================================================
ALTER TABLE public.event_series
  ADD COLUMN IF NOT EXISTS chapter_id               uuid REFERENCES public.chapters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS season                   smallint,
  ADD COLUMN IF NOT EXISTS episode_number           smallint,
  ADD COLUMN IF NOT EXISTS series_subscribe_enabled boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_event_series_chapter ON public.event_series(chapter_id);

-- ============================================================
-- ALTER: events - add missing columns (keep is_published/is_cancelled for compat)
-- ============================================================
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS chapter_id                  uuid REFERENCES public.chapters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS location_id                 uuid REFERENCES public.event_locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS type                        event_type,
  ADD COLUMN IF NOT EXISTS status                      event_status NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS short_description           text,
  ADD COLUMN IF NOT EXISTS thumbnail_url               text,
  ADD COLUMN IF NOT EXISTS cover_image_url             text,
  ADD COLUMN IF NOT EXISTS attendance_mode             text NOT NULL DEFAULT 'in_person',
  ADD COLUMN IF NOT EXISTS registration_opens_at       timestamptz,
  ADD COLUMN IF NOT EXISTS registration_closes_at      timestamptz,
  ADD COLUMN IF NOT EXISTS is_featured                 boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hackathon_teams_lock_at     timestamptz,
  ADD COLUMN IF NOT EXISTS hackathon_submission_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS hackathon_judging_ends_at   timestamptz,
  ADD COLUMN IF NOT EXISTS event_hashtag               text,
  ADD COLUMN IF NOT EXISTS social_card_url             text,
  ADD COLUMN IF NOT EXISTS waitlist_auto_promote       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS refund_policy_text          text,
  ADD COLUMN IF NOT EXISTS deleted_at                  timestamptz;

CREATE INDEX IF NOT EXISTS idx_events_chapter   ON public.events(chapter_id);
CREATE INDEX IF NOT EXISTS idx_events_status    ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_type      ON public.events(type);
CREATE INDEX IF NOT EXISTS idx_events_featured  ON public.events(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_events_deleted   ON public.events(deleted_at) WHERE deleted_at IS NOT NULL;

-- Migrate is_published/is_cancelled to status column (safe backfill)
UPDATE public.events SET status = 'published'  WHERE is_published = true  AND is_cancelled = false AND status = 'draft';
UPDATE public.events SET status = 'cancelled'  WHERE is_cancelled = true  AND status = 'draft';

-- ============================================================
-- NEW TABLE: event_tags
-- ============================================================
CREATE TABLE IF NOT EXISTS public.event_tags (
  id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name  text NOT NULL UNIQUE,
  color text
);

ALTER TABLE public.event_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tags_select_all" ON public.event_tags FOR SELECT USING (true);

-- ============================================================
-- NEW TABLE: event_tag_links
-- ============================================================
CREATE TABLE IF NOT EXISTS public.event_tag_links (
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  tag_id   uuid NOT NULL REFERENCES public.event_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, tag_id)
);

ALTER TABLE public.event_tag_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tag_links_select_all" ON public.event_tag_links FOR SELECT USING (true);

-- ============================================================
-- NEW TABLE: event_tracks
-- ============================================================
CREATE TABLE IF NOT EXISTS public.event_tracks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name        text NOT NULL,
  color       text,
  sort_order  smallint NOT NULL DEFAULT 0
);

ALTER TABLE public.event_tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tracks_select_all" ON public.event_tracks FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_event_tracks_event ON public.event_tracks(event_id);

-- ============================================================
-- NEW TABLE: event_sessions (replaces simple event_speakers for full schedule)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.event_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  track_id    uuid REFERENCES public.event_tracks(id) ON DELETE SET NULL,
  title       text NOT NULL,
  description text,
  speaker_id  uuid REFERENCES public.members(id) ON DELETE SET NULL,
  starts_at   timestamptz,
  ends_at     timestamptz,
  room        text,
  cfp_id      uuid  -- FK to cfp_submissions added in 0019
);

ALTER TABLE public.event_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_select_all" ON public.event_sessions FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_event_sessions_event ON public.event_sessions(event_id);
CREATE INDEX IF NOT EXISTS idx_event_sessions_track ON public.event_sessions(track_id);

-- ============================================================
-- NEW TABLE: event_templates
-- ============================================================
CREATE TABLE IF NOT EXISTS public.event_templates (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid REFERENCES public.chapters(id) ON DELETE SET NULL,
  name       text NOT NULL,
  config     jsonb NOT NULL DEFAULT '{}'
);

ALTER TABLE public.event_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "templates_select_board" ON public.event_templates FOR SELECT USING (public.is_board());
