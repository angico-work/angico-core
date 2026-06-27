package com.angico.core.memory;

import com.angico.common.ClockProvider;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

/**
 * Persistent {@link MemoryGateway}: writes events, objects and relations to the
 * database so a território accumulates a durable, queryable memory. Marked
 * {@link Primary} so it is preferred over {@link LoggingMemoryGateway}.
 *
 * <p>All methods run inside the caller's transaction (domain writes and memory
 * writes commit atomically) — see {@link OperationalMemoryService}.
 */
@Component
@Primary
public class JpaMemoryGateway implements MemoryGateway {

    private static final Logger LOGGER = LoggerFactory.getLogger(JpaMemoryGateway.class);

    // Self-managed mapper: Spring Boot 4 defaults to Jackson 3, so there is no
    // Jackson-2 ObjectMapper bean to inject. Used only to serialize event payloads.
    private final ObjectMapper objectMapper = new ObjectMapper();

    private final MemoryEventRepository events;
    private final MemoryObjectRepository objects;
    private final MemoryRelationRepository relations;
    private final ClockProvider clock;

    public JpaMemoryGateway(
            MemoryEventRepository events,
            MemoryObjectRepository objects,
            MemoryRelationRepository relations,
            ClockProvider clock
    ) {
        this.events = events;
        this.objects = objects;
        this.relations = relations;
        this.clock = clock;
    }

    @Override
    public MemoryEventResult appendEvent(MemoryEvent event) {
        String eventId = UUID.randomUUID().toString();
        StoredMemoryEvent stored = new StoredMemoryEvent(
                eventId,
                event.workspaceId(),
                event.entityType(),
                event.entityId(),
                event.eventType(),
                event.source(),
                event.actorId(),
                event.deviceId(),
                event.correlationId(),
                event.causationId(),
                event.schemaVersion(),
                event.occurredAt(),
                serializePayload(event)
        );
        StoredMemoryEvent saved = events.save(stored);
        long entityVersion = events.countByWorkspaceIdAndEntityTypeAndEntityId(
                event.workspaceId(), event.entityType(), event.entityId());
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
        Instant now = clock.now();
        objects.findByWorkspaceIdAndEntityTypeAndEntityId(workspaceId, entityType, entityId)
                .ifPresentOrElse(
                        existing -> existing.update(externalCode, name, status, source, now),
                        () -> objects.save(new StoredMemoryObject(
                                workspaceId, entityType, entityId, externalCode, name, status, source, now))
                );
    }

    @Override
    public void ensureActiveRelation(
            String workspaceId,
            String originType,
            String originId,
            String destinationType,
            String destinationId,
            String relationType,
            String source,
            String notes
    ) {
        boolean exists = !relations
                .findByWorkspaceIdAndOriginTypeAndOriginIdAndDestinationTypeAndDestinationIdAndRelationTypeAndActiveTrue(
                        workspaceId, originType, originId, destinationType, destinationId, relationType)
                .isEmpty();
        if (!exists) {
            relations.save(new StoredMemoryRelation(
                    workspaceId, originType, originId, destinationType, destinationId,
                    relationType, source, notes, clock.now()));
        }
    }

    @Override
    public void replaceActiveRelation(
            String workspaceId,
            String originType,
            String originId,
            String destinationType,
            String destinationId,
            String relationType,
            String source,
            String notes
    ) {
        endActiveRelations(workspaceId, originType, originId, relationType);
        relations.save(new StoredMemoryRelation(
                workspaceId, originType, originId, destinationType, destinationId,
                relationType, source, notes, clock.now()));
    }

    @Override
    public int endActiveRelations(
            String workspaceId,
            String originType,
            String originId,
            String relationType
    ) {
        Instant now = clock.now();
        List<StoredMemoryRelation> active = relations
                .findByWorkspaceIdAndOriginTypeAndOriginIdAndRelationTypeAndActiveTrue(
                        workspaceId, originType, originId, relationType);
        active.forEach(relation -> relation.end(now));
        return active.size();
    }

    private String serializePayload(MemoryEvent event) {
        try {
            return objectMapper.writeValueAsString(event.payload());
        } catch (JsonProcessingException ex) {
            LOGGER.warn("Falha ao serializar payload do evento {}; armazenando vazio.", event.eventType(), ex);
            return "{}";
        }
    }
}
