ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS prefix text,
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz;
