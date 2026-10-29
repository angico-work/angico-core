CREATE TABLE intelligence_analysis (
    id VARCHAR(36) PRIMARY KEY,
    workspace_id VARCHAR(255) NOT NULL,
    actor_id VARCHAR(255) NOT NULL,
    request_id VARCHAR(64) NOT NULL,
    input_hash VARCHAR(64) NOT NULL,
    entity_type VARCHAR(32) NOT NULL,
    input_text TEXT NOT NULL,
    model VARCHAR(100) NOT NULL,
    prompt_version VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL,
    sources_json TEXT NOT NULL,
    response_json TEXT,
    input_tokens INTEGER,
    output_tokens INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uq_intelligence_request UNIQUE (workspace_id, actor_id, request_id)
);
CREATE INDEX idx_intelligence_actor_time ON intelligence_analysis (actor_id, created_at);
CREATE INDEX idx_intelligence_workspace_time ON intelligence_analysis (workspace_id, created_at);
CREATE INDEX idx_ai_observation_context ON observacao_territorial (workspace_id, created_at DESC, id DESC);
CREATE INDEX idx_ai_problem_context ON problema_socioambiental (workspace_id, created_at DESC, id DESC);
CREATE INDEX idx_ai_action_context ON acao (workspace_id, created_at DESC, id DESC);
CREATE INDEX idx_ai_result_context ON resultado (workspace_id, created_at DESC, id DESC);
