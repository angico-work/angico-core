package com.angico.glimpse;

import java.time.Instant;

/**
 * A read-model row of the território's living memory (one stored event),
 * for the "Memória do Território" timeline.
 */
public record MemoriaEvent(
        long sequence,
        String entityType,
        String entityId,
        String eventType,
        String actorId,
        Instant occurredAt
) {
}
