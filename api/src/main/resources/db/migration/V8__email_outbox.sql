CREATE TABLE email_outbox (
                            id BIGSERIAL PRIMARY KEY,
                            to_address VARCHAR(254) NOT NULL,
                            subject VARCHAR(255) NOT NULL,
                            body_html TEXT NOT NULL,
                            body_text TEXT,
                            template VARCHAR(64) NOT NULL,
                            status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
                            attempts INT NOT NULL DEFAULT 0,
                            last_error TEXT,
                            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                            sent_at TIMESTAMPTZ,
                            provider_message_id VARCHAR(255)
);

CREATE INDEX idx_email_outbox_pending ON email_outbox(created_at) WHERE status = 'PENDING';
CREATE INDEX idx_email_outbox_sent_per_day ON email_outbox(sent_at) WHERE status = 'SENT';
