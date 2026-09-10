ALTER TABLE accounts
    ADD COLUMN failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN lockout_until TIMESTAMPTZ;
