package com.angico.core.memory;

import java.time.Instant;
import java.util.UUID;

import com.angico.core.ontology.OntologyService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

@Component
public class LoggingMemoryGateway implements MemoryGateway {

    private final CoreObjectRepository objectRepository;
    private final CoreRelationRepository relationRepository;
    private final CoreEventRepository eventRepository;
    private final CoreEntityStateRepository entityStateRepository;
    private final CoreCommitSequenceRepository commitSequenceRepository;
    private final OntologyService ontologyService;
    private final ObjectMapper objectMapper;

    public LoggingMemoryGateway(
            CoreObjectRepository objectRepository,
            CoreRelationRepository relationRepository,
            CoreEventRepository eventRepository,
            CoreEntityStateRepository entityStateRepository,
            CoreCommitSequenceRepository commitSequenceRepository,
            OntologyService ontologyService,
            ObjectMapper objectMapper
    ) {
        this.objectRepository = objectRepository;
        this.relationRepository = relationRepository;
        this.eventRepository = eventRepository;
        this.entityStateRepository = entityStateRepository;
        this.commitSequenceRepository = commitSequenceRepository;
        this.ontologyService = ontologyService;
        this.objectMapper = objectMapper;
    }

    @Override
    public MemoryEventResult appendEvent(MemoryEvent event) {
        ontologyService.requireObjectType(event.entityType());

        String eventId = UUID.randomUUID().toString();
        Instant now = Instant.now();

        CoreCommitSequence commit = new CoreCommitSequence();
        commit.setWorkspaceId(event.workspaceId());
        commit.setCreatedAt(now);
        commit = commitSequenceRepository.save(commit);

        CoreEntityState state = entityStateRepository
                .findByWorkspaceIdAndEntityTypeAndEntityId(
                        event.workspaceId(),
                        event.entityType(),
                        event.entityId()
                )
                .orElseGet(CoreEntityState::new);
        state.setWorkspaceId(event.workspaceId());
        state.setEntityType(event.entityType());
        state.setEntityId(event.entityId());
        state.setEntityVersion(state.getEntityVersion() + 1);
        state.setUpdatedAt(now);
        state = entityStateRepository.save(state);

        CoreEvent row = new CoreEvent();
        row.setId(eventId);
        row.setWorkspaceId(event.workspaceId());
        row.setEntityType(event.entityType());
        row.setEntityId(event.entityId());
        row.setEventType(event.eventType());
        row.setActorId(event.actorId());
        row.setDeviceId(event.deviceId());
        row.setSource(event.source());
        row.setOccurredAt(event.occurredAt());
        row.setCommitSequence(commit.getId());
        row.setEntityVersion(state.getEntityVersion());
        row.setPayloadJson(toJson(event.payload()));
        eventRepository.save(row);

        return new MemoryEventResult(
                eventId,
                commit.getId(),
                commit.getId(),
                state.getEntityVersion()
        );
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
        ontologyService.requireObjectType(entityType);

        Instant now = Instant.now();
        CoreObject row = objectRepository
                .findByWorkspaceIdAndEntityTypeAndEntityId(workspaceId, entityType, entityId)
                .orElseGet(CoreObject::new);
        row.setWorkspaceId(workspaceId);
        row.setEntityType(entityType);
        row.setEntityId(entityId);
        row.setExternalCode(externalCode);
        row.setName(name);
        row.setStatus(status);
        row.setSource(source);
        if (row.getCreatedAt() == null) {
            row.setCreatedAt(now);
        }
        row.setUpdatedAt(now);
        objectRepository.save(row);
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
        ontologyService.requireValidRelation(originType, relationType, destinationType);

        relationRepository
                .findByWorkspaceIdAndOriginTypeAndOriginIdAndDestinationTypeAndDestinationIdAndRelationTypeAndEndedAtIsNull(
                        workspaceId,
                        originType,
                        originId,
                        destinationType,
                        destinationId,
                        relationType
                )
                .orElseGet(() -> {
                    CoreRelation relation = new CoreRelation();
                    relation.setWorkspaceId(workspaceId);
                    relation.setOriginType(originType);
                    relation.setOriginId(originId);
                    relation.setDestinationType(destinationType);
                    relation.setDestinationId(destinationId);
                    relation.setRelationType(relationType);
                    relation.setSource(source);
                    relation.setNotes(notes);
                    relation.setCreatedAt(Instant.now());
                    return relationRepository.save(relation);
                });
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
        ensureActiveRelation(
                workspaceId,
                originType,
                originId,
                destinationType,
                destinationId,
                relationType,
                source,
                notes
        );
    }

    @Override
    public int endActiveRelations(
            String workspaceId,
            String originType,
            String originId,
            String relationType
    ) {
        Instant now = Instant.now();
        var relations = relationRepository
                .findByWorkspaceIdAndOriginTypeAndOriginIdAndRelationTypeAndEndedAtIsNull(
                        workspaceId,
                        originType,
                        originId,
                        relationType
                );
        relations.forEach(relation -> relation.setEndedAt(now));
        relationRepository.saveAll(relations);
        return relations.size();
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("Payload de memoria invalido.", ex);
        }
    }
}
