ALTER TABLE IF EXISTS missao
    ADD COLUMN IF NOT EXISTS territorio_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_missao_workspace_territorio
    ON missao (workspace_id, territorio_id);
