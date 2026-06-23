ALTER TABLE accounts
    ADD COLUMN mfa_email_enabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE mfa_codes (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    code_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mfa_codes_account_active ON mfa_codes(account_id) WHERE used_at IS NULL;
