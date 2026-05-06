CREATE TABLE reposts (
                       id BIGSERIAL PRIMARY KEY,
                       account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
                       post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
                       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                       deleted_at TIMESTAMPTZ,
                       UNIQUE(account_id, post_id)
);

CREATE INDEX idx_reposts_by_account ON reposts(account_id, created_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_reposts_by_post ON reposts(post_id) WHERE deleted_at IS NULL;

ALTER TABLE posts
  ADD COLUMN quoted_post_id BIGINT REFERENCES posts(id) ON DELETE SET NULL;

CREATE INDEX idx_posts_quoting ON posts(quoted_post_id, created_at DESC)
  WHERE quoted_post_id IS NOT NULL AND deleted_at IS NULL;
