CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_accounts_username_trgm ON accounts USING GIN (username gin_trgm_ops);
CREATE INDEX idx_accounts_display_name_trgm ON accounts USING GIN (display_name gin_trgm_ops);
