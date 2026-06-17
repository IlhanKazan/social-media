ALTER TABLE messages RENAME COLUMN image_url TO image_public_id;

-- Legacy rows stored a full secure_url; reduce to the bare public_id (best effort).
-- Note: those assets were uploaded as public delivery type and won't resolve via
-- authenticated signed delivery, but the feature is new with negligible data.
UPDATE messages
SET image_public_id = regexp_replace(
        image_public_id,
        '^https?://[^/]+/[^/]+/image/upload/(?:v[0-9]+/)?(.+)\.[a-zA-Z0-9]+$',
        '\1'
    )
WHERE image_public_id LIKE 'http%';
