ALTER TABLE accounts
    ADD COLUMN mfa_totp_secret VARCHAR(255),
    ADD COLUMN mfa_totp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN mfa_totp_last_step BIGINT;

CREATE TABLE mfa_recovery_codes (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    code_hash VARCHAR(64) NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mfa_recovery_account_active ON mfa_recovery_codes(account_id) WHERE used_at IS NULL;
