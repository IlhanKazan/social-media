ALTER TABLE accounts
    ADD COLUMN cover_position INTEGER NOT NULL DEFAULT 50;

ALTER TABLE accounts
    ADD CONSTRAINT chk_accounts_cover_position CHECK (cover_position BETWEEN 0 AND 100);
