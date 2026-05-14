ALTER TABLE refresh_tokens
    ALTER COLUMN token_hash TYPE VARCHAR(64),
    ALTER COLUMN replaced_by TYPE VARCHAR(64);

ALTER TABLE password_reset_tokens
    ALTER COLUMN token_hash TYPE VARCHAR(64);

ALTER TABLE email_verification_tokens
    ALTER COLUMN token_hash TYPE VARCHAR(64);
