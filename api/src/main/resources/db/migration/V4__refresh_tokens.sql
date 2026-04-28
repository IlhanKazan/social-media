CREATE TABLE refresh_tokens (
                              id BIGSERIAL PRIMARY KEY,
                              account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
                              token_hash CHAR(64) NOT NULL UNIQUE,
                              family_id UUID NOT NULL,
                              issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                              expires_at TIMESTAMPTZ NOT NULL,
                              revoked_at TIMESTAMPTZ,
                              replaced_by CHAR(64),
                              user_agent VARCHAR(500),
                              ip_address INET,
                              CONSTRAINT chk_replaced_by_only_when_revoked CHECK (
                                replaced_by IS NULL OR revoked_at IS NOT NULL
                                )
);

CREATE INDEX idx_refresh_tokens_account_active ON refresh_tokens(account_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_refresh_tokens_family ON refresh_tokens(family_id);
CREATE INDEX idx_refresh_tokens_cleanup ON refresh_tokens(expires_at);
