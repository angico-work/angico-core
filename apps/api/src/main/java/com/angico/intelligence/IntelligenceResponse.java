package com.angico.intelligence;

import java.util.List;

public record IntelligenceResponse(String analysisId, String status, String category, String summary,
        List<Connection> connections, List<Recommendation> recommendations,
        List<IntelligenceSource> sources, String message) {
    public record Connection(String sourceId, String relationType, String reason) {}
    public record Recommendation(String text, List<String> sourceIds) {}
    static IntelligenceResponse state(String id, String status, String message) {
        return new IntelligenceResponse(id,status,null,"",List.of(),List.of(),List.of(),message);
    }
}
