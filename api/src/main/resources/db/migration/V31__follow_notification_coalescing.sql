-- Pre-coalescing data has one unread row per follow event; collapse each recipient's
-- unread follow rows to the newest one so the unique index can build.
DELETE FROM notifications
WHERE read_at IS NULL AND type = 'FOLLOW'
  AND id NOT IN (
    SELECT DISTINCT ON (recipient_id) id
    FROM notifications
    WHERE read_at IS NULL AND type = 'FOLLOW'
    ORDER BY recipient_id, created_at DESC
  );

CREATE UNIQUE INDEX idx_notifications_coalesce_follow ON notifications (recipient_id)
    WHERE read_at IS NULL AND type = 'FOLLOW';
