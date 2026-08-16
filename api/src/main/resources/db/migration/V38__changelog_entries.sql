-- Release notes, shown at /changelog and linked from the mobile update prompt.
--
-- A table rather than one blob in system_settings: entries are per release, the
-- page reads newest first, and the mobile client needs to point at a specific
-- version rather than at whatever the latest text happens to say.
CREATE TABLE changelog_entries (
    id           BIGSERIAL PRIMARY KEY,
    version      VARCHAR(32)  NOT NULL,
    -- Title and body are stored per language rather than in a separate
    -- translations table: there are exactly two, both are always written
    -- together, and a join for two columns would buy nothing.
    title_tr     VARCHAR(200) NOT NULL,
    title_en     VARCHAR(200) NOT NULL,
    body_tr      TEXT         NOT NULL,
    body_en      TEXT         NOT NULL,
    -- NULL until published, so an entry can be drafted before a release ships.
    published_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at   TIMESTAMPTZ
);

-- One entry per version among the live rows. A partial index rather than a
-- plain unique constraint, so a soft-deleted entry does not block reusing its
-- version number.
CREATE UNIQUE INDEX idx_changelog_version_active
    ON changelog_entries (version)
    WHERE deleted_at IS NULL;

-- The public page's only query: published entries, newest first.
CREATE INDEX idx_changelog_published
    ON changelog_entries (published_at DESC)
    WHERE deleted_at IS NULL AND published_at IS NOT NULL;

CREATE TRIGGER trg_changelog_entries_updated_at
    BEFORE UPDATE ON changelog_entries
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
