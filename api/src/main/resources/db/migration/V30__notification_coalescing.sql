ALTER TABLE notifications
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Pre-coalescing data has one unread row per like/repost event; collapse each
-- (recipient, type, reference) group to its newest row so the unique index can build.
DELETE FROM notifications
WHERE read_at IS NULL AND type IN ('LIKE', 'REPOST')
  AND id NOT IN (
    SELECT DISTINCT ON (recipient_id, type, reference_id) id
    FROM notifications
    WHERE read_at IS NULL AND type IN ('LIKE', 'REPOST')
    ORDER BY recipient_id, type, reference_id, created_at DESC
  );

CREATE UNIQUE INDEX idx_notifications_coalesce ON notifications (recipient_id, type, reference_id)
    WHERE read_at IS NULL AND type IN ('LIKE', 'REPOST');

CREATE INDEX idx_notifications_unread_recent ON notifications (recipient_id, updated_at DESC)
    WHERE read_at IS NULL;
