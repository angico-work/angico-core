package com.angico.intelligence;

import java.time.Instant;

public record IntelligenceSource(String sourceId, String entityType, String entityId,
        String title, String excerpt, Instant occurredAt) {}
