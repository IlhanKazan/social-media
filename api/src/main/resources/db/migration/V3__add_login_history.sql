CREATE TABLE login_history (
                             id BIGSERIAL PRIMARY KEY,
                             account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
                             ip_address VARCHAR(45),
                             user_agent TEXT,
                             created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_login_history_account ON login_history(account_id, created_at DESC);
