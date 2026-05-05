CREATE TABLE audit_log (
                         id BIGSERIAL PRIMARY KEY,
                         actor_id BIGINT REFERENCES accounts(id) ON DELETE SET NULL,
                         actor_username CITEXT,
                         action VARCHAR(64) NOT NULL,
                         target_type VARCHAR(32),
                         target_id BIGINT,
                         metadata JSONB,
                         ip_address INET,
                         user_agent VARCHAR(500),
                         created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_actor ON audit_log(actor_id, created_at DESC);
CREATE INDEX idx_audit_log_target ON audit_log(target_type, target_id, created_at DESC);
CREATE INDEX idx_audit_log_action ON audit_log(action, created_at DESC);
