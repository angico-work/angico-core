CREATE TABLE intelligence_feedback (
    id VARCHAR(36) PRIMARY KEY,
    analysis_id VARCHAR(36) NOT NULL REFERENCES intelligence_analysis(id) ON DELETE CASCADE,
    actor_id VARCHAR(255) NOT NULL,
    suggestion_id VARCHAR(64) NOT NULL,
    decision VARCHAR(16) NOT NULL,
    corrected_category VARCHAR(80),
    reviewed_category VARCHAR(80),
    request_id VARCHAR(64) NOT NULL,
    input_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT uq_intelligence_feedback_request UNIQUE (analysis_id, actor_id, request_id),
    CONSTRAINT uq_intelligence_feedback_suggestion UNIQUE (analysis_id, actor_id, suggestion_id)
);
CREATE INDEX idx_intelligence_feedback_time ON intelligence_feedback (created_at DESC);
