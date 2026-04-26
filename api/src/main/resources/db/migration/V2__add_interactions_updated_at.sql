-- interactions tablosu V1'de updated_at olmadan oluşturuldu;
-- BaseEntity auditing için gerekli.
ALTER TABLE interactions
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TRIGGER trg_interactions_updated_at BEFORE UPDATE ON interactions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();