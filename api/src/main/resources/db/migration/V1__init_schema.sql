CREATE EXTENSION IF NOT EXISTS citext;

-- Auto-update trigger function (used by every mutable table)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ROLES
CREATE TABLE roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(20) NOT NULL UNIQUE
);

INSERT INTO roles (name) VALUES ('ROLE_ADMIN'), ('ROLE_USER');

-- ACCOUNTS
CREATE TABLE accounts (
    id BIGSERIAL PRIMARY KEY,
    username CITEXT NOT NULL UNIQUE,
    email CITEXT NOT NULL UNIQUE,
    phone VARCHAR(20) UNIQUE,
    password VARCHAR(255) NOT NULL,
    display_name VARCHAR(50),
    bio VARCHAR(160),
    profile_image_url VARCHAR(500),
    cover_image_url VARCHAR(500),
    role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_accounts_active ON accounts(id) WHERE deleted_at IS NULL;
CREATE TRIGGER trg_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- POSTS
CREATE TABLE posts (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    content VARCHAR(500) NOT NULL,
    image_url VARCHAR(500),
    parent_post_id BIGINT REFERENCES posts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_posts_feed ON posts(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_by_account ON posts(account_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_replies ON posts(parent_post_id, created_at DESC)
    WHERE parent_post_id IS NOT NULL AND deleted_at IS NULL;

CREATE TRIGGER trg_posts_updated_at BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- INTERACTIONS (likes, dislikes, comments unified)
CREATE TABLE interactions (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('LIKE', 'DISLIKE', 'COMMENT')),
    content TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT chk_comment_has_content CHECK (
        (type IN ('LIKE', 'DISLIKE') AND content IS NULL) OR
        (type = 'COMMENT' AND content IS NOT NULL AND length(content) > 0)
    )
);

CREATE UNIQUE INDEX uq_one_reaction_per_user_post
    ON interactions(account_id, post_id, type)
    WHERE type IN ('LIKE', 'DISLIKE') AND deleted_at IS NULL;

CREATE INDEX idx_interactions_post ON interactions(post_id, type)
    WHERE deleted_at IS NULL;

-- FOLLOWS
CREATE TABLE follows (
    id BIGSERIAL PRIMARY KEY,
    follower_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    following_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(follower_id, following_id),
    CHECK (follower_id != following_id)
);

CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);

-- NOTIFICATIONS
CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    recipient_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    actor_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('LIKE', 'COMMENT', 'FOLLOW', 'REPLY', 'MENTION')),
    reference_id BIGINT,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_unread ON notifications(recipient_id, created_at DESC)
    WHERE read_at IS NULL;
CREATE INDEX idx_notifications_all ON notifications(recipient_id, created_at DESC);

-- CONVERSATIONS (canonical participant order: a < b)
CREATE TABLE conversations (
    id BIGSERIAL PRIMARY KEY,
    participant_a_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    participant_b_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(participant_a_id, participant_b_id),
    CHECK (participant_a_id < participant_b_id)
);

CREATE INDEX idx_conversations_participant_a ON conversations(participant_a_id, last_message_at DESC NULLS LAST);
CREATE INDEX idx_conversations_participant_b ON conversations(participant_b_id, last_message_at DESC NULLS LAST);

-- MESSAGES
CREATE TABLE messages (
    id BIGSERIAL PRIMARY KEY,
    conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 4000),
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_thread ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_unread ON messages(conversation_id, sender_id) WHERE read_at IS NULL;
