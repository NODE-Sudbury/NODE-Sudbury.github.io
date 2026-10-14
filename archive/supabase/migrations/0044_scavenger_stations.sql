-- ============================================================
-- Scavenger Hunt Stations and Stamps
-- Required by src/app/api/scan/stamp/route.ts
-- hunt_stations/hunt_stamp_records in 0019 are the internal
-- engagement tables; these are the QR-scan public tables.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.scavenger_stations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hunt_id       uuid NOT NULL REFERENCES public.scavenger_hunts(id) ON DELETE CASCADE,
  name          text NOT NULL,
  hint_text     text,
  points_value  integer NOT NULL DEFAULT 10,
  sort_order    integer NOT NULL DEFAULT 0,
  qr_token      text NOT NULL UNIQUE,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.scavenger_stamps (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id  uuid NOT NULL REFERENCES public.scavenger_stations(id) ON DELETE CASCADE,
  member_id   uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  stamped_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (station_id, member_id)
);

-- RLS
ALTER TABLE public.scavenger_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scavenger_stamps   ENABLE ROW LEVEL SECURITY;

-- Anyone can read station info (needed to validate QR scan)
CREATE POLICY IF NOT EXISTS "Stations public read" ON public.scavenger_stations
  FOR SELECT USING (true);

-- Board can manage stations
CREATE POLICY IF NOT EXISTS "Board manage stations" ON public.scavenger_stations
  FOR ALL USING (is_board());

-- Members can insert their own stamps
CREATE POLICY IF NOT EXISTS "Members stamp own" ON public.scavenger_stamps
  FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM public.members WHERE id = member_id));

-- Members can read their own stamps
CREATE POLICY IF NOT EXISTS "Members read own stamps" ON public.scavenger_stamps
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.members WHERE id = member_id));

-- Board can read all stamps
CREATE POLICY IF NOT EXISTS "Board read all stamps" ON public.scavenger_stamps
  FOR SELECT USING (is_board());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scavenger_stations_hunt    ON public.scavenger_stations (hunt_id);
CREATE INDEX IF NOT EXISTS idx_scavenger_stations_token   ON public.scavenger_stations (qr_token);
CREATE INDEX IF NOT EXISTS idx_scavenger_stamps_station   ON public.scavenger_stamps (station_id);
CREATE INDEX IF NOT EXISTS idx_scavenger_stamps_member    ON public.scavenger_stamps (member_id);
