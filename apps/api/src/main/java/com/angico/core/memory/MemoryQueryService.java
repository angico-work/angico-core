package com.angico.core.memory;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

@Service
public class MemoryQueryService {

    private final CoreObjectRepository objectRepository;
    private final CoreRelationRepository relationRepository;
    private final CoreEventRepository eventRepository;
    private final ObjectMapper objectMapper;

    public MemoryQueryService(
            CoreObjectRepository objectRepository,
            CoreRelationRepository relationRepository,
            CoreEventRepository eventRepository,
            ObjectMapper objectMapper
    ) {
        this.objectRepository = objectRepository;
        this.relationRepository = relationRepository;
        this.eventRepository = eventRepository;
        this.objectMapper = objectMapper;
    }

    public List<Map<String, Object>> timelineForWorkspace(String workspaceId) {
        return eventRepository.findByWorkspaceIdOrderByCommitSequenceAsc(workspaceId)
                .stream()
                .map(this::eventMap)
                .toList();
    }

    public List<Map<String, Object>> timelineForEntity(
            String workspaceId,
            String entityType,
            String entityId
    ) {
        return eventRepository
                .findByWorkspaceIdAndEntityTypeAndEntityIdOrderByCommitSequenceAsc(
                        workspaceId,
                        entityType,
                        entityId
                )
                .stream()
                .map(this::eventMap)
                .toList();
    }

    public List<Map<String, Object>> timelineForTerritory(String workspaceId, String territorioEntityId) {
        Set<String> keys = new LinkedHashSet<>();
        keys.add("TERRITORIO:" + territorioEntityId);
        relationRepository.findActiveRelationsForNode(workspaceId, "TERRITORIO", territorioEntityId)
                .forEach(relation -> {
                    keys.add(relation.getOriginType() + ":" + relation.getOriginId());
                    keys.add(relation.getDestinationType() + ":" + relation.getDestinationId());
                });

        return eventRepository.findByWorkspaceIdOrderByCommitSequenceAsc(workspaceId)
                .stream()
                .filter(event -> keys.contains(event.getEntityType() + ":" + event.getEntityId()))
                .map(this::eventMap)
                .toList();
    }

    public Map<String, Object> graphForEntity(String workspaceId, String entityType, String entityId) {
        List<CoreRelation> direct = relationRepository.findActiveRelationsForNode(
                workspaceId,
                entityType,
                entityId
        );
        return graphFromRelations(workspaceId, direct);
    }

    public Map<String, Object> graphForTerritory(String workspaceId, String territorioEntityId) {
        List<CoreRelation> direct = relationRepository.findActiveRelationsForNode(
                workspaceId,
                "TERRITORIO",
                territorioEntityId
        );
        Set<String> nodeKeys = new LinkedHashSet<>();
        direct.forEach(relation -> {
            nodeKeys.add(relation.getOriginType() + ":" + relation.getOriginId());
            nodeKeys.add(relation.getDestinationType() + ":" + relation.getDestinationId());
        });

        List<CoreRelation> expanded = new ArrayList<>(direct);
        relationRepository.findByWorkspaceIdAndEndedAtIsNull(workspaceId)
                .stream()
                .filter(relation ->
                        nodeKeys.contains(relation.getOriginType() + ":" + relation.getOriginId())
                                || nodeKeys.contains(relation.getDestinationType() + ":" + relation.getDestinationId())
                )
                .forEach(expanded::add);

        return graphFromRelations(workspaceId, expanded);
    }

    private Map<String, Object> graphFromRelations(String workspaceId, List<CoreRelation> relations) {
        Map<String, CoreObject> objects = new HashMap<>();
        objectRepository.findByWorkspaceId(workspaceId).forEach(object ->
                objects.put(object.getEntityType() + ":" + object.getEntityId(), object)
        );

        Map<String, Map<String, Object>> nodes = new LinkedHashMap<>();
        List<Map<String, Object>> edges = new ArrayList<>();

        relations.forEach(relation -> {
            String originKey = relation.getOriginType() + ":" + relation.getOriginId();
            String destinationKey = relation.getDestinationType() + ":" + relation.getDestinationId();

            nodes.putIfAbsent(originKey, nodeMap(originKey, relation.getOriginType(), relation.getOriginId(), objects.get(originKey)));
            nodes.putIfAbsent(destinationKey, nodeMap(destinationKey, relation.getDestinationType(), relation.getDestinationId(), objects.get(destinationKey)));

            edges.add(Map.of(
                    "id", relation.getId(),
                    "from", originKey,
                    "to", destinationKey,
                    "relationType", relation.getRelationType(),
                    "label", relation.getOriginType() + " " + relation.getRelationType() + " " + relation.getDestinationType()
            ));
        });

        return Map.of(
                "nodes", List.copyOf(nodes.values()),
                "relations", edges
        );
    }

    private Map<String, Object> nodeMap(String key, String type, String id, CoreObject object) {
        return Map.of(
                "id", key,
                "entityType", type,
                "entityId", id,
                "name", object == null ? key : object.getName(),
                "status", object == null ? "DESCONHECIDO" : object.getStatus()
        );
    }

    private Map<String, Object> eventMap(CoreEvent event) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", event.getId());
        result.put("workspaceId", event.getWorkspaceId());
        result.put("entityType", event.getEntityType());
        result.put("entityId", event.getEntityId());
        result.put("eventType", event.getEventType());
        result.put("actorId", event.getActorId() == null ? "" : event.getActorId());
        result.put("deviceId", event.getDeviceId() == null ? "" : event.getDeviceId());
        result.put("payload", parsePayload(event.getPayloadJson()));
        result.put("occurredAt", event.getOccurredAt());
        result.put("entityVersion", event.getEntityVersion());
        result.put("commitSequence", event.getCommitSequence());
        return result;
    }

    private Map<String, Object> parsePayload(String payloadJson) {
        try {
            return objectMapper.readValue(payloadJson, new TypeReference<>() {
            });
        } catch (Exception ex) {
            return Map.of();
        }
    }
}
