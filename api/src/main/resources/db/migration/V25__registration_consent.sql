ALTER TABLE accounts
    ADD COLUMN consent_version VARCHAR(20),
    ADD COLUMN terms_accepted_at TIMESTAMPTZ;

-- Accounts created before explicit consent capture are backfilled with a sentinel
-- so they are not misreported as having no consent on file.
UPDATE accounts
SET consent_version = 'legacy',
    terms_accepted_at = created_at
WHERE consent_version IS NULL;
