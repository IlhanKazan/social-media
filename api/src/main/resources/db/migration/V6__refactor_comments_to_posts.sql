DELETE FROM interactions WHERE type = 'COMMENT';

ALTER TABLE interactions DROP CONSTRAINT IF EXISTS chk_comment_has_content;

ALTER TABLE interactions DROP CONSTRAINT IF EXISTS interactions_type_check;
ALTER TABLE interactions ADD CONSTRAINT interactions_type_check CHECK (type IN ('LIKE', 'DISLIKE'));

ALTER TABLE interactions DROP COLUMN IF EXISTS content;
