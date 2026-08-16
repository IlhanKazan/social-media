-- Opt-out plumbing for notification email.
--
-- The URL is stored on the row rather than rebuilt at send time so the
-- List-Unsubscribe header and the link in the body are guaranteed to match, and
-- so a message that sat in the queue still carries the link it was rendered
-- with. NULL means transactional mail, which carries no opt-out by design.
ALTER TABLE email_outbox
    ADD COLUMN unsubscribe_url VARCHAR(512);

-- Whether the account accepts optional email at all. Kept separate from the
-- per-category notification preferences: this is the single switch a
-- one-click unsubscribe flips, and it has to work without knowing which
-- category the message belonged to.
ALTER TABLE accounts
    ADD COLUMN email_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE;

-- Records the moment of opt-out. Consent handling has to be able to show when
-- someone withdrew it, not just that they did.
ALTER TABLE accounts
    ADD COLUMN email_unsubscribed_at TIMESTAMPTZ;
