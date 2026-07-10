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

    default void ensureActiveRelation(
            String workspaceId,
            String originType,
            String originId,
            String destinationType,
            String destinationId,
            String relationType,
            String source,
            String notes
    ) {
        ensureActiveRelation(
                workspaceId,
                originType,
                originId,
                destinationType,
                destinationId,
                relationType,
                MemoryRelationMetadata.fromLegacy(source, notes)
        );
    }

    void ensureActiveRelation(
            String workspaceId,
            String originType,
            String originId,
            String destinationType,
            String destinationId,
            String relationType,
            MemoryRelationMetadata metadata
    );

    default void replaceActiveRelation(
            String workspaceId,
            String originType,
            String originId,
            String destinationType,
            String destinationId,
            String relationType,
            String source,
            String notes
    ) {
        replaceActiveRelation(
                workspaceId,
                originType,
                originId,
                destinationType,
                destinationId,
                relationType,
                MemoryRelationMetadata.fromLegacy(source, notes)
        );
    }

    void replaceActiveRelation(
            String workspaceId,
            String originType,
            String originId,
            String destinationType,
            String destinationId,
            String relationType,
            MemoryRelationMetadata metadata
    );

    int endActiveRelations(
            String workspaceId,
            String originType,
            String originId,
            String relationType
    );
}
