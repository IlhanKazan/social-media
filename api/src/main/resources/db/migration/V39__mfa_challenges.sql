CREATE TABLE mfa_challenges (
    id              BIGSERIAL PRIMARY KEY,
    account_id      BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    token_id        VARCHAR(36) NOT NULL UNIQUE,
    expires_at      TIMESTAMPTZ NOT NULL,
    consumed_at     TIMESTAMPTZ,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mfa_challenges_account_active ON mfa_challenges(account_id) WHERE consumed_at IS NULL;
CREATE INDEX idx_mfa_challenges_account_recent ON mfa_challenges(account_id, created_at);
