package com.angico.core.memory;

public interface MemoryGateway {

    MemoryEventResult appendEvent(MemoryEvent event);

    void upsertObject(
            String workspaceId,
            String entityType,
            String entityId,
            String externalCode,
            String name,
            String status,
            String source
    );

    void ensureActiveRelation(
            String workspaceId,
            String originType,
            String originId,
            String destinationType,
            String destinationId,
            String relationType,
            String source,
            String notes
    );

    void replaceActiveRelation(
            String workspaceId,
            String originType,
            String originId,
            String destinationType,
            String destinationId,
            String relationType,
            String source,
            String notes
    );

    int endActiveRelations(
            String workspaceId,
            String originType,
            String originId,
            String relationType
    );
}
