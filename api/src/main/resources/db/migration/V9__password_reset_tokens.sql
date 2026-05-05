CREATE TABLE password_reset_tokens (
                                     id BIGSERIAL PRIMARY KEY,
                                     account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
                                     token_hash CHAR(64) NOT NULL UNIQUE,
                                     expires_at TIMESTAMPTZ NOT NULL,
                                     used_at TIMESTAMPTZ,
                                     requested_ip INET,
                                     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_password_reset_tokens_account_active
  ON password_reset_tokens(account_id) WHERE used_at IS NULL;
