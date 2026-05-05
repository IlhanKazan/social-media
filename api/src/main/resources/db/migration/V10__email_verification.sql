ALTER TABLE accounts
  ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN email_verified_at TIMESTAMPTZ;

CREATE TABLE email_verification_tokens (
                                         id BIGSERIAL PRIMARY KEY,
                                         account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
                                         token_hash CHAR(64) NOT NULL UNIQUE,
                                         expires_at TIMESTAMPTZ NOT NULL,
                                         used_at TIMESTAMPTZ,
                                         created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_verification_account_active
  ON email_verification_tokens(account_id) WHERE used_at IS NULL;
