ALTER TABLE notifications
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX idx_notifications_coalesce ON notifications (recipient_id, type, reference_id)
    WHERE read_at IS NULL AND type IN ('LIKE', 'REPOST');

CREATE INDEX idx_notifications_unread_recent ON notifications (recipient_id, updated_at DESC)
    WHERE read_at IS NULL;
