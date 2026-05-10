ALTER TABLE accounts
  ADD COLUMN banned_at TIMESTAMPTZ,
  ADD COLUMN banned_reason VARCHAR(500);
