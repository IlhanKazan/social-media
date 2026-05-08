ALTER TABLE posts
  ADD COLUMN moderation_status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (moderation_status IN ('PENDING', 'CLEAN', 'FLAGGED')),
  ADD COLUMN admin_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
    CHECK (admin_status IN ('ACTIVE', 'REMOVED_BY_ADMIN', 'RESTORED_BY_ADMIN')),
  ADD COLUMN moderated_at TIMESTAMPTZ,
  ADD COLUMN moderation_categories JSONB,
  ADD COLUMN moderation_provider VARCHAR(32);

CREATE INDEX idx_posts_visible_feed ON posts(created_at DESC)
  WHERE deleted_at IS NULL
    AND moderation_status IN ('PENDING', 'CLEAN')
    AND admin_status = 'ACTIVE';

CREATE INDEX idx_posts_moderation_queue ON posts(created_at ASC)
  WHERE moderation_status = 'FLAGGED' AND deleted_at IS NULL;

CREATE TABLE reports (
                       id BIGSERIAL PRIMARY KEY,
                       post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
                       reporter_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
                       reason VARCHAR(64) NOT NULL,
                       details VARCHAR(500),
                       resolved_at TIMESTAMPTZ,
                       resolved_by_id BIGINT REFERENCES accounts(id) ON DELETE SET NULL,
                       resolution VARCHAR(32),
                       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                       UNIQUE(post_id, reporter_id)
);

CREATE INDEX idx_reports_unresolved ON reports(created_at ASC) WHERE resolved_at IS NULL;
