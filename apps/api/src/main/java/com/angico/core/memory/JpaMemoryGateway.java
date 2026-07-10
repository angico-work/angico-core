package com.angico.core.memory;

import com.angico.common.ClockProvider;
import com.angico.core.ontology.OntologyService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class JpaMemoryGateway implements MemoryGateway {

    private final MemoryEventRepository events;
    private final MemoryObjectRepository objects;
    private final MemoryRelationRepository relations;
    private final ClockProvider clock;
    private final OntologyService ontology;
    private final ObjectMapper objectMapper;

    public JpaMemoryGateway(
            MemoryEventRepository events,
            MemoryObjectRepository objects,
            MemoryRelationRepository relations,
            ClockProvider clock,
            OntologyService ontology,
            ObjectMapper objectMapper
    ) {
        this.events = events;
        this.objects = objects;
        this.relations = relations;
        this.clock = clock;
        this.ontology = ontology;
        this.objectMapper = objectMapper;
    }

    @Override
    public MemoryEventResult appendEvent(MemoryEvent event) {
        String entityType = ontology.canonicalObjectType(event.entityType());
        String payload = serializePayload(event);
        String eventId = UUID.randomUUID().toString();
        StoredMemoryEvent stored = new StoredMemoryEvent(
                eventId,
                event.workspaceId(),
                entityType,
                event.entityId(),
                event.eventType(),
                event.source(),
                event.actorId(),
                event.deviceId(),
                event.correlationId(),
                event.causationId(),
                event.schemaVersion(),
                event.occurredAt(),
                clock.now(),
                event.idempotencyKey(),
                event.syncStatus().name(),
                payload
        );
        stored.assignOrganizationId(event.organizationId());
        StoredMemoryEvent saved = events.saveAndFlush(stored);
        long entityVersion = events
                .countByWorkspaceIdAndEntityTypeIgnoreCaseAndEntityIdAndSequenceLessThanEqual(
                        event.workspaceId(), entityType, event.entityId(), saved.getSequence());
        saved.assignEntityVersion(entityVersion);
        return new MemoryEventResult(eventId, saved.getSequence(), saved.getSequence(), entityVersion);
    }

    @Override
    public void upsertObject(
            String workspaceId,
            String entityType,
            String entityId,
            String externalCode,
            String name,
            String status,
            String source
    ) {
        workspaceId = requireText(workspaceId, "workspaceId");
        entityId = requireText(entityId, "entityId");
        String canonicalType = ontology.canonicalObjectType(entityType);
        Instant now = clock.now();
        List<StoredMemoryObject> matches = objects
                .findByWorkspaceIdAndEntityTypeIgnoreCaseAndEntityId(workspaceId, canonicalType, entityId);
        if (matches.size() > 1) {
            throw new IllegalStateException(
                    "Mais de um objeto de memoria representa " + canonicalType + ":" + entityId);
        }
        if (matches.isEmpty()) {
            objects.save(new StoredMemoryObject(
                    workspaceId, canonicalType, entityId, externalCode, name, status, source, now));
            return;
        }
        StoredMemoryObject existing = matches.getFirst();
        existing.canonicalizeType(canonicalType);
        existing.update(externalCode, name, status, source, now);
    }

    @Override
    public void ensureActiveRelation(
            String workspaceId,
            String originType,
            String originId,
            String destinationType,
            String destinationId,
            String relationType,
            MemoryRelationMetadata metadata
    ) {
        workspaceId = requireText(workspaceId, "workspaceId");
        originId = requireText(originId, "originId");
        destinationId = requireText(destinationId, "destinationId");
        if (metadata == null) {
            throw new IllegalArgumentException("metadata e obrigatorio.");
        }
        String canonicalOrigin = ontology.canonicalObjectType(originType);
        String canonicalDestination = ontology.canonicalObjectType(destinationType);
        String canonicalRelation = ontology.canonicalRelationType(relationType);
        ontology.requireValidRelation(canonicalOrigin, canonicalRelation, canonicalDestination);
        String activeIdentity = StoredMemoryRelation.activeIdentityFor(
                workspaceId,
                canonicalOrigin,
                originId,
                canonicalDestination,
                destinationId,
                canonicalRelation
        );
        List<StoredMemoryRelation> active = relations.findActiveRelation(
                workspaceId, canonicalOrigin, originId, canonicalDestination, destinationId, canonicalRelation);
        if (active.size() > 1) {
            throw new IllegalStateException("Relacoes ativas ambiguas para " + activeIdentity);
        }
        if (active.size() == 1) {
            active.getFirst().claimActiveIdentity(activeIdentity);
            return;
        }
        relations.saveAndFlush(new StoredMemoryRelation(
                workspaceId, canonicalOrigin, originId, canonicalDestination, destinationId,
                canonicalRelation, metadata, clock.now()));
    }

    @Override
    public void replaceActiveRelation(
            String workspaceId,
            String originType,
            String originId,
            String destinationType,
            String destinationId,
            String relationType,
            MemoryRelationMetadata metadata
    ) {
        workspaceId = requireText(workspaceId, "workspaceId");
        originId = requireText(originId, "originId");
        destinationId = requireText(destinationId, "destinationId");
        if (metadata == null) {
            throw new IllegalArgumentException("metadata e obrigatorio.");
        }
        String canonicalOrigin = ontology.canonicalObjectType(originType);
        String canonicalDestination = ontology.canonicalObjectType(destinationType);
        String canonicalRelation = ontology.canonicalRelationType(relationType);
        ontology.requireValidRelation(canonicalOrigin, canonicalRelation, canonicalDestination);
        endActiveRelations(workspaceId, canonicalOrigin, originId, canonicalRelation);
        relations.saveAndFlush(new StoredMemoryRelation(
                workspaceId, canonicalOrigin, originId, canonicalDestination, destinationId,
                canonicalRelation, metadata, clock.now()));
    }

    @Override
    public int endActiveRelations(
            String workspaceId,
            String originType,
            String originId,
            String relationType
    ) {
        workspaceId = requireText(workspaceId, "workspaceId");
        originId = requireText(originId, "originId");
        String canonicalOrigin = ontology.canonicalObjectType(originType);
        String canonicalRelation = ontology.canonicalRelationType(relationType);
        Instant now = clock.now();
        List<StoredMemoryRelation> active = relations
                .findActiveRelationsFromOrigin(
                        workspaceId, canonicalOrigin, originId, canonicalRelation);
        active.forEach(relation -> relation.end(now));
        return active.size();
    }

    private String serializePayload(MemoryEvent event) {
        try {
            return objectMapper.writeValueAsString(event.payload());
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("Payload de memoria invalido.", ex);
        }
    }

    private String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " e obrigatorio.");
        }
        return value.strip();
    }
}
