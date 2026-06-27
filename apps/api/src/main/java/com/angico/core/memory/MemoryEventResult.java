package com.angico.core.memory;

public record MemoryEventResult(
        String eventId,
        long sequence,
        long commitSequence,
        long entityVersion
) {
}
