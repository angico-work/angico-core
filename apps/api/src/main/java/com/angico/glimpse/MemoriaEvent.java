package com.angico.glimpse;

import java.time.Instant;

public record MemoriaEvent(
        long sequence,
        String entityType,
        String entityId,
        String eventType,
        String actorId,
        Instant occurredAt
) {
}
