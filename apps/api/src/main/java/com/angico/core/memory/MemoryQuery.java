package com.angico.core.memory;

import java.time.Instant;
import java.util.Locale;

public record MemoryQuery(
        String workspaceId,
        String entityType,
        String entityId,
        Instant from,
        Instant to,
        String eventType,
        String actorId,
        String source,
        String syncStatus
) {
    public MemoryQuery {
        if (workspaceId == null || workspaceId.isBlank()) {
            throw new IllegalArgumentException("workspaceId e obrigatorio.");
        }
        workspaceId = workspaceId.strip();
        entityType = optional(entityType);
        entityId = optional(entityId);
        eventType = optional(eventType);
        actorId = optional(actorId);
        source = optional(source);
        syncStatus = optional(syncStatus);
        if (from != null && to != null && from.isAfter(to)) {
            throw new IllegalArgumentException("O inicio do periodo deve anteceder o fim.");
        }
        if (syncStatus != null) {
            syncStatus = MemorySyncStatus.valueOf(syncStatus.toUpperCase(Locale.ROOT)).name();
        }
    }

    public static MemoryQuery forWorkspace(String workspaceId) {
        return new MemoryQuery(workspaceId, null, null, null, null, null, null, null, null);
    }

    private static String optional(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }
}
