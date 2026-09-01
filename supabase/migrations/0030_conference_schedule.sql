-- ============================================================
-- Migration 0030: Add conference schedule columns
-- ============================================================

ALTER TABLE public.event_sessions
  ADD COLUMN IF NOT EXISTS session_type text NOT NULL DEFAULT 'talk'
    CHECK (session_type IN ('keynote','talk','workshop','panel','lightning_talk','break','lunch','networking','sponsor_demo','codelab')),
  ADD COLUMN IF NOT EXISTS speaker_name text,
  ADD COLUMN IF NOT EXISTS speaker_bio  text;

-- Board insert/update/delete policies for tracks
CREATE POLICY IF NOT EXISTS "tracks_board_all" ON public.event_tracks
  FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());

-- Board insert/update/delete policies for sessions
CREATE POLICY IF NOT EXISTS "sessions_board_all" ON public.event_sessions
  FOR ALL USING (public.is_board()) WITH CHECK (public.is_board());
