-- Migration: mentor_availability_slots
-- Created: 2026-08-31
-- Adds office hours slot booking to the mentor system.

CREATE TABLE IF NOT EXISTS mentor_availability_slots (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id             uuid        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  mentor_member_id     uuid        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  starts_at            timestamptz NOT NULL,
  ends_at              timestamptz NOT NULL,
  booked_by_member_id  uuid        REFERENCES members(id),
  booked_at            timestamptz,
  notes                text,
  created_at           timestamptz DEFAULT now()
);

-- Index for fast lookups by event
CREATE INDEX IF NOT EXISTS idx_mentor_slots_event
  ON mentor_availability_slots(event_id);

-- Index for fast lookups by mentor
CREATE INDEX IF NOT EXISTS idx_mentor_slots_mentor
  ON mentor_availability_slots(mentor_member_id);

-- Constraint: slot end must be after slot start
ALTER TABLE mentor_availability_slots
  DROP CONSTRAINT IF EXISTS chk_slot_times;

ALTER TABLE mentor_availability_slots
  ADD CONSTRAINT chk_slot_times CHECK (ends_at > starts_at);

-- Row-level security (enable if your project uses RLS)
-- ALTER TABLE mentor_availability_slots ENABLE ROW LEVEL SECURITY;
--
-- Allow anyone authenticated to read slots
-- CREATE POLICY "read slots" ON mentor_availability_slots
--   FOR SELECT USING (auth.uid() IS NOT NULL);
--
-- Allow the mentor to insert their own slots
-- CREATE POLICY "mentor insert" ON mentor_availability_slots
--   FOR INSERT WITH CHECK (mentor_member_id = auth.uid());
--
-- Allow the booking user to update booked_by_member_id on an unbooked slot
-- CREATE POLICY "book slot" ON mentor_availability_slots
--   FOR UPDATE USING (booked_by_member_id IS NULL AND mentor_member_id <> auth.uid())
--   WITH CHECK (booked_by_member_id = auth.uid());
