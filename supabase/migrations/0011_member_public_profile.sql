-- Add public profile visibility flag to members
ALTER TABLE members ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

-- Backfill existing members to public by default
UPDATE members SET is_public = true WHERE is_public IS DISTINCT FROM true;

-- Allow anyone to read public member profiles
CREATE POLICY "Public profiles are viewable by anyone"
  ON members FOR SELECT
  USING (is_public = true);
