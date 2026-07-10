package com.angico.core.memory;

import java.math.BigDecimal;

public record MemoryRelationMetadata(
        String source,
        String context,
        String actorId,
        BigDecimal confidence
) {
    public MemoryRelationMetadata {
        source = optional(source);
        context = optional(context);
        actorId = optional(actorId);
        if (confidence != null
                && (confidence.compareTo(BigDecimal.ZERO) < 0
                    || confidence.compareTo(BigDecimal.ONE) > 0)) {
            throw new IllegalArgumentException("confidence deve estar entre 0 e 1.");
        }
    }

    public static MemoryRelationMetadata fromLegacy(String source, String notes) {
        return new MemoryRelationMetadata(source, notes, null, null);
    }

    private static String optional(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }
}
