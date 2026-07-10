package com.angico.core.memory;

import com.angico.core.ontology.OntologyService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

@Service
public class MemoryQueryService {

    private final MemoryObjectRepository objectRepository;
    private final MemoryRelationRepository relationRepository;
    private final MemoryEventRepository eventRepository;
    private final OntologyService ontology;
    private final ObjectMapper objectMapper;

    public MemoryQueryService(
            MemoryObjectRepository objectRepository,
            MemoryRelationRepository relationRepository,
            MemoryEventRepository eventRepository,
            OntologyService ontology,
            ObjectMapper objectMapper
    ) {
        this.objectRepository = objectRepository;
        this.relationRepository = relationRepository;
        this.eventRepository = eventRepository;
        this.ontology = ontology;
        this.objectMapper = objectMapper;
    }

    public List<Map<String, Object>> timelineForWorkspace(String workspaceId) {
        return timeline(MemoryQuery.forWorkspace(workspaceId));
    }

    public List<Map<String, Object>> timelineForEntity(
            String workspaceId,
            String entityType,
            String entityId
    ) {
        return timeline(new MemoryQuery(
                workspaceId, entityType, entityId, null, null, null, null, null, null));
    }

    public List<Map<String, Object>> timeline(MemoryQuery memoryQuery) {
        String canonicalType = memoryQuery.entityType() == null
                ? null
                : ontology.canonicalObjectType(memoryQuery.entityType());
        return eventRepository.findAll((root, query, builder) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(builder.equal(root.get("workspaceId"), memoryQuery.workspaceId()));
            if (canonicalType != null) {
                predicates.add(builder.equal(
                        builder.upper(root.get("entityType")), canonicalType));
            }
            if (memoryQuery.entityId() != null) {
                predicates.add(builder.equal(root.get("entityId"), memoryQuery.entityId()));
            }
            if (memoryQuery.from() != null) {
                predicates.add(builder.greaterThanOrEqualTo(
                        root.get("occurredAt"), memoryQuery.from()));
            }
            if (memoryQuery.to() != null) {
                predicates.add(builder.lessThanOrEqualTo(
                        root.get("occurredAt"), memoryQuery.to()));
            }
            if (memoryQuery.eventType() != null) {
                predicates.add(builder.equal(root.get("eventType"), memoryQuery.eventType()));
            }
            if (memoryQuery.actorId() != null) {
                predicates.add(builder.equal(root.get("actorId"), memoryQuery.actorId()));
            }
            if (memoryQuery.source() != null) {
                predicates.add(builder.equal(root.get("source"), memoryQuery.source()));
            }
            if (memoryQuery.syncStatus() != null) {
                Predicate status = builder.equal(root.get("syncStatus"), memoryQuery.syncStatus());
                if (MemorySyncStatus.SERVER_RECORDED.name().equals(memoryQuery.syncStatus())) {
                    status = builder.or(status, builder.isNull(root.get("syncStatus")));
                }
                predicates.add(status);
            }
            return builder.and(predicates.toArray(Predicate[]::new));
        }, Sort.by(Sort.Direction.ASC, "sequence")).stream().map(this::eventMap).toList();
    }

    public List<Map<String, Object>> timelineForTerritory(String workspaceId, String territorioEntityId) {
        Set<String> keys = new LinkedHashSet<>();
        keys.add(nodeKey(OntologyService.TERRITORIO, territorioEntityId));
        relationRepository.findActiveRelationsForNode(
                        workspaceId, OntologyService.TERRITORIO, territorioEntityId)
                .forEach(relation -> {
                    keys.add(nodeKey(relation.getOriginType(), relation.getOriginId()));
                    keys.add(nodeKey(relation.getDestinationType(), relation.getDestinationId()));
                });

        return eventRepository.findByWorkspaceIdOrderBySequenceAsc(workspaceId)
                .stream()
                .filter(event -> keys.contains(nodeKey(event.getEntityType(), event.getEntityId())))
                .map(this::eventMap)
                .toList();
    }

    public Map<String, Object> graphForEntity(String workspaceId, String entityType, String entityId) {
        String canonicalType = ontology.canonicalObjectType(entityType);
        List<StoredMemoryRelation> direct = relationRepository.findActiveRelationsForNode(
                workspaceId, canonicalType, entityId);
        return graphFromRelations(workspaceId, direct);
    }

    public Map<String, Object> graphForTerritory(String workspaceId, String territorioEntityId) {
        List<StoredMemoryRelation> direct = relationRepository.findActiveRelationsForNode(
                workspaceId, OntologyService.TERRITORIO, territorioEntityId);
        Set<String> nodeKeys = new LinkedHashSet<>();
        direct.forEach(relation -> {
            nodeKeys.add(nodeKey(relation.getOriginType(), relation.getOriginId()));
            nodeKeys.add(nodeKey(relation.getDestinationType(), relation.getDestinationId()));
        });

        List<StoredMemoryRelation> expanded = new ArrayList<>(direct);
        relationRepository.findByWorkspaceIdAndActiveTrue(workspaceId)
                .stream()
                .filter(relation -> nodeKeys.contains(nodeKey(relation.getOriginType(), relation.getOriginId()))
                        || nodeKeys.contains(nodeKey(relation.getDestinationType(), relation.getDestinationId())))
                .filter(relation -> !expanded.contains(relation))
                .forEach(expanded::add);

        return graphFromRelations(workspaceId, expanded);
    }

    private Map<String, Object> graphFromRelations(
            String workspaceId,
            List<StoredMemoryRelation> relations
    ) {
        Map<String, StoredMemoryObject> objects = new HashMap<>();
        objectRepository.findByWorkspaceId(workspaceId).forEach(object -> {
            String key = nodeKey(object.getEntityType(), object.getEntityId());
            if (objects.putIfAbsent(key, object) != null) {
                throw new IllegalStateException("Objetos de memoria ambiguos para " + key);
            }
        });

        Map<String, Map<String, Object>> nodes = new LinkedHashMap<>();
        List<Map<String, Object>> edges = new ArrayList<>();
        relations.forEach(relation -> {
            String originKey = nodeKey(relation.getOriginType(), relation.getOriginId());
            String destinationKey = nodeKey(relation.getDestinationType(), relation.getDestinationId());
            nodes.putIfAbsent(originKey, nodeMap(
                    originKey, relation.getOriginType(), relation.getOriginId(), objects.get(originKey)));
            nodes.putIfAbsent(destinationKey, nodeMap(
                    destinationKey, relation.getDestinationType(), relation.getDestinationId(),
                    objects.get(destinationKey)));
            edges.add(relationMap(relation, originKey, destinationKey));
        });

        return Map.of(
                "nodes", List.copyOf(nodes.values()),
                "relations", List.copyOf(edges)
        );
    }

    private Map<String, Object> nodeMap(
            String key,
            String type,
            String id,
            StoredMemoryObject object
    ) {
        Map<String, Object> node = new LinkedHashMap<>();
        node.put("id", key);
        node.put("entityType", ontology.canonicalObjectType(type));
        node.put("entityId", id);
        node.put("name", object == null || object.getName() == null ? key : object.getName());
        node.put("status", object == null || object.getStatus() == null
                ? "DESCONHECIDO" : object.getStatus());
        return node;
    }

    private Map<String, Object> relationMap(
            StoredMemoryRelation relation,
            String originKey,
            String destinationKey
    ) {
        Map<String, Object> edge = new LinkedHashMap<>();
        edge.put("id", relation.getId());
        edge.put("from", originKey);
        edge.put("to", destinationKey);
        edge.put("relationType", ontology.canonicalRelationType(relation.getRelationType()));
        edge.put("label", ontology.canonicalObjectType(relation.getOriginType()) + " "
                + ontology.canonicalRelationType(relation.getRelationType()) + " "
                + ontology.canonicalObjectType(relation.getDestinationType()));
        edge.put("source", relation.getSource());
        edge.put("notes", relation.getNotes());
        edge.put("active", relation.isActive());
        edge.put("createdAt", relation.getCreatedAt());
        edge.put("endedAt", relation.getEndedAt());
        edge.put("ontologyValid", isValidRelation(relation));
        return edge;
    }

    private boolean isValidRelation(StoredMemoryRelation relation) {
        try {
            ontology.requireValidRelation(
                    relation.getOriginType(),
                    relation.getRelationType(),
                    relation.getDestinationType());
            return true;
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }

    private Map<String, Object> eventMap(StoredMemoryEvent event) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", event.getEventId());
        result.put("sequence", event.getSequence());
        result.put("workspaceId", event.getWorkspaceId());
        result.put("organizationId", event.getWorkspaceId());
        result.put("entityType", ontology.canonicalObjectType(event.getEntityType()));
        result.put("entityId", event.getEntityId());
        result.put("eventType", event.getEventType());
        result.put("actorId", event.getActorId());
        result.put("deviceId", event.getDeviceId());
        result.put("correlationId", event.getCorrelationId());
        result.put("causationId", event.getCausationId());
        result.put("source", event.getSource());
        result.put("schemaVersion", event.getSchemaVersion());
        Map<String, Object> payload = parsePayload(event.getPayloadJson());
        result.put("payload", payload);
        result.put("occurredAt", event.getOccurredAt());
        result.put("recordedAt", event.getRecordedAt());
        result.put("idempotencyKey", event.getIdempotencyKey());
        result.put("syncStatus", event.getSyncStatus());
        result.put("commitSequence", event.getSequence());
        copyPayloadField(payload, result, "previousState");
        copyPayloadField(payload, result, "newState");
        copyPayloadField(payload, result, "evidences");
        return result;
    }

    private void copyPayloadField(
            Map<String, Object> payload,
            Map<String, Object> result,
            String field
    ) {
        if (payload.containsKey(field)) {
            result.put(field, payload.get(field));
        }
    }

    private Map<String, Object> parsePayload(String payloadJson) {
        try {
            return objectMapper.readValue(payloadJson, new TypeReference<>() {
            });
        } catch (Exception ex) {
            throw new IllegalStateException("Payload de memoria persistido e invalido.", ex);
        }
    }

    private String nodeKey(String type, String id) {
        return ontology.canonicalObjectType(type) + ":" + id;
    }
}
