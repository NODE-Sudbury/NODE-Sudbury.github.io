-- TODO: Run this migration against your Supabase database.
-- It cannot be applied automatically from this repo.
-- Command: supabase db push  (or paste into Supabase SQL editor)

CREATE TABLE IF NOT EXISTS ticket_tiers (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     uuid        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name         text        NOT NULL,
  price_cents  int         NOT NULL DEFAULT 0,
  capacity     int,
  description  text,
  is_active    boolean     DEFAULT true,
  sort_order   int         DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ticket_tiers_event_id_idx ON ticket_tiers(event_id);

-- RLS
ALTER TABLE ticket_tiers ENABLE ROW LEVEL SECURITY;

-- Public can read active tiers for published events
CREATE POLICY "ticket_tiers_public_read" ON ticket_tiers
  FOR SELECT USING (is_active = true);

-- Board / admin can do everything
CREATE POLICY "ticket_tiers_admin_all" ON ticket_tiers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = auth.uid()
        AND members.role IN ('board', 'admin', 'super_admin')
    )
  );
