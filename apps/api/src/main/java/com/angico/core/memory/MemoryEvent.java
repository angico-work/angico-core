package com.angico.core.memory;

import java.time.Instant;
import java.util.Map;

public record MemoryEvent(
        String workspaceId,
        String entityType,
        String entityId,
        String eventType,
        String source,
        String actorId,
        String deviceId,
        String correlationId,
        String causationId,
        int schemaVersion,
        Instant occurredAt,
        Map<String, Object> payload
) {

    public MemoryEvent {
        requireText(workspaceId, "workspaceId");
        requireText(entityType, "entityType");
        requireText(entityId, "entityId");
        requireText(eventType, "eventType");
        requireText(source, "source");

        if (schemaVersion < 1) {
            throw new IllegalArgumentException(
                    "schemaVersion deve ser maior ou igual a 1."
            );
        }

        occurredAt = occurredAt == null
                ? Instant.now()
                : occurredAt;

        payload = payload == null
                ? Map.of()
                : Map.copyOf(payload);
    }

    private static void requireText(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(fieldName + " é obrigatório.");
        }
    }
}
