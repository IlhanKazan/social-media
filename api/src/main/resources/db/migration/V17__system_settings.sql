CREATE TABLE system_settings (
                               key VARCHAR(64) PRIMARY KEY,
                               value_text TEXT,
                               value_bool BOOLEAN,
                               updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                               updated_by_id BIGINT REFERENCES accounts(id) ON DELETE SET NULL
);

INSERT INTO system_settings (key, value_bool) VALUES
                                                ('registration_enabled', TRUE),
                                                ('verified_only_posting', FALSE),
                                                ('moderation_enabled', TRUE);
