ALTER TABLE reports
  ADD CONSTRAINT chk_report_reason
    CHECK (reason IN ('HATE', 'HARASSMENT', 'SPAM', 'SELF_HARM', 'OTHER'));

ALTER TABLE posts
  ADD COLUMN moderation_attempts INT NOT NULL DEFAULT 0;

CREATE INDEX idx_posts_pending_retry ON posts(created_at)
  WHERE moderation_status = 'PENDING' AND deleted_at IS NULL;
