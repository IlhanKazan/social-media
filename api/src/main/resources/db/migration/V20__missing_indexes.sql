-- accounts: admin filtering by ban status
CREATE INDEX idx_accounts_banned ON accounts(banned_at)
    WHERE banned_at IS NOT NULL AND deleted_at IS NULL;

-- accounts: admin filtering by email_verified
CREATE INDEX idx_accounts_email_verified ON accounts(email_verified)
    WHERE deleted_at IS NULL;

-- reports: grouping by post_id for admin reports queue
CREATE INDEX idx_reports_post_unresolved ON reports(post_id, resolved_at)
    WHERE resolved_at IS NULL;

-- email_outbox: flusher query (status=PENDING ordered by created_at)
CREATE INDEX idx_email_outbox_status_created ON email_outbox(status, created_at)
    WHERE status = 'PENDING';

-- interactions: user-centric queries
CREATE INDEX idx_interactions_account ON interactions(account_id, deleted_at)
    WHERE deleted_at IS NULL;
