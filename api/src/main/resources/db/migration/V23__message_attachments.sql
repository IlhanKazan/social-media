ALTER TABLE messages
    ADD COLUMN image_url VARCHAR(512),
    ADD COLUMN shared_post_id BIGINT REFERENCES posts(id) ON DELETE SET NULL;

ALTER TABLE messages ALTER COLUMN content DROP NOT NULL;

ALTER TABLE messages ADD CONSTRAINT chk_messages_has_payload
    CHECK (content IS NOT NULL OR image_url IS NOT NULL OR shared_post_id IS NOT NULL);

CREATE INDEX idx_messages_shared_post ON messages(shared_post_id) WHERE shared_post_id IS NOT NULL;
