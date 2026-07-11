package com.angico.rastro;

import com.angico.core.memory.MemoryEventRepository;
import com.angico.core.memory.MemoryObjectRepository;
import com.angico.core.memory.MemoryRelationRepository;
import com.angico.core.memory.StoredMemoryEvent;
import com.angico.core.memory.StoredMemoryObject;
import com.angico.core.memory.StoredMemoryRelation;
import com.angico.core.ontology.OntologyService;
import com.angico.mensagens.ConversationAccessPolicy;
import com.angico.rastro.RastroResponse.Event;
import com.angico.rastro.RastroResponse.ExpectedRelation;
import com.angico.rastro.RastroResponse.Gap;
import com.angico.rastro.RastroResponse.Limits;
import com.angico.rastro.RastroResponse.Participant;
import com.angico.rastro.RastroResponse.Reference;
import com.angico.rastro.RastroResponse.Relation;
import com.angico.rastro.RastroResponse.Stage;
import com.angico.workspaces.WorkspaceAuthorizationService;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RastroService {

    private static final int MAX_NODES = 200;
    private static final int MAX_RELATIONS = 400;
    private static final int MAX_EVENTS = 600;
    private static final Pattern SAFE_ID = Pattern.compile("[A-Za-z0-9._:-]{1,160}");
    private static final Set<String> ROOT_TYPES = Set.of(
            OntologyService.TERRITORIO,
            OntologyService.OBSERVACAO,
            OntologyService.PROBLEMA,
            OntologyService.POTENCIALIDADE,
            OntologyService.MISSAO,
            OntologyService.ACAO,
            OntologyService.PESSOA,
            OntologyService.ORGANIZACAO,
            OntologyService.RECURSO,
            OntologyService.EVIDENCIA,
            OntologyService.RESULTADO,
            OntologyService.INDICADOR,
            OntologyService.MEDICAO);
    private static final Set<String> PARTICIPANT_TYPES = Set.of(
            OntologyService.PESSOA, OntologyService.ORGANIZACAO);
    private static final Set<String> TRACE_RELATIONS = Set.of(
            signature("OBSERVACAO", "OCORRE_EM", "TERRITORIO"),
            signature("OBSERVACAO", "IDENTIFICA", "PROBLEMA"),
            signature("OBSERVACAO", "COMPROVADA_POR", "EVIDENCIA"),
            signature("PROBLEMA", "AFETA", "TERRITORIO"),
            signature("POTENCIALIDADE", "EXISTE_EM", "TERRITORIO"),
            signature("POTENCIALIDADE", "APOIA", "MISSAO"),
            signature("MISSAO", "ENFRENTA", "PROBLEMA"),
            signature("MISSAO", "ATUA_EM", "TERRITORIO"),
            signature("MISSAO", "COMPOSTA_POR", "ACAO"),
            signature("PESSOA", "RESPONSAVEL_POR", "MISSAO"),
            signature("PESSOA", "RESPONSAVEL_POR", "ACAO"),
            signature("PESSOA", "PARTICIPA_DE", "ORGANIZACAO"),
            signature("ORGANIZACAO", "CONDUZ", "MISSAO"),
            signature("ORGANIZACAO", "MOBILIZA", "MISSAO"),
            signature("ACAO", "GERA", "EVIDENCIA"),
            signature("ACAO", "PRODUZ", "RESULTADO"),
            signature("ACAO", "UTILIZA", "RECURSO"),
            signature("EVIDENCIA", "SUSTENTA", "RESULTADO"),
            signature("INDICADOR", "MEDE", "RESULTADO"),
            signature("MEDICAO", "REFERE_SE_A", "INDICADOR"),
            signature("CONVERSA", "PERTENCE_A", "TERRITORIO"),
            signature("CONVERSA", "REFERE_SE_A", "OBSERVACAO"),
            signature("CONVERSA", "REFERE_SE_A", "PROBLEMA"),
            signature("CONVERSA", "REFERE_SE_A", "POTENCIALIDADE"),
            signature("CONVERSA", "REFERE_SE_A", "MISSAO"),
            signature("CONVERSA", "REFERE_SE_A", "ACAO"),
            signature("CONVERSA", "REFERE_SE_A", "RESULTADO"),
            signature("CONVERSA", "REFERE_SE_A", "INDICADOR"),
            signature("CONVERSA", "TEM_PARTICIPANTE", "PESSOA"),
            signature("MENSAGEM", "ENVIADA_EM", "CONVERSA"),
            signature("MENSAGEM", "ENVIADA_POR", "PESSOA"),
            signature("MENSAGEM", "ANEXA", "ANEXO"),
            signature("MENSAGEM", "MENCIONA", "TERRITORIO"),
            signature("MENSAGEM", "MENCIONA", "OBSERVACAO"),
            signature("MENSAGEM", "MENCIONA", "PROBLEMA"),
            signature("MENSAGEM", "MENCIONA", "POTENCIALIDADE"),
            signature("MENSAGEM", "MENCIONA", "MISSAO"),
            signature("MENSAGEM", "MENCIONA", "ACAO"),
            signature("MENSAGEM", "MENCIONA", "RESULTADO"),
            signature("MENSAGEM", "MENCIONA", "INDICADOR")
    );
    private static final Map<String, String> RESOURCES = Map.ofEntries(
            Map.entry("TERRITORIO", "territorios"),
            Map.entry("OBSERVACAO", "observacoes"),
            Map.entry("PROBLEMA", "problemas"),
            Map.entry("POTENCIALIDADE", "potencialidades"),
            Map.entry("MISSAO", "missoes"),
            Map.entry("ACAO", "acoes"),
            Map.entry("EVIDENCIA", "evidencias"),
            Map.entry("RESULTADO", "resultados"),
            Map.entry("INDICADOR", "indicadores"),
            Map.entry("MEDICAO", "medicoes"),
            Map.entry("PESSOA", "pessoas"),
            Map.entry("ORGANIZACAO", "organizacoes"),
            Map.entry("RECURSO", "recursos"),
            Map.entry("CONVERSA", "conversas"),
            Map.entry("MENSAGEM", "mensagens"),
            Map.entry("ANEXO", "anexos")
    );
    private static final Map<String, Integer> STAGE_ORDER = Map.ofEntries(
            Map.entry("TERRITORIO", 10),
            Map.entry("OBSERVACAO", 20),
            Map.entry("POTENCIALIDADE", 21),
            Map.entry("PROBLEMA", 22),
            Map.entry("MISSAO", 30),
            Map.entry("ACAO", 40),
            Map.entry("CONVERSA", 41),
            Map.entry("MENSAGEM", 42),
            Map.entry("ANEXO", 43),
            Map.entry("RECURSO", 45),
            Map.entry("EVIDENCIA", 50),
            Map.entry("RESULTADO", 60),
            Map.entry("INDICADOR", 70),
            Map.entry("MEDICAO", 80)
    );

    private final MemoryObjectRepository objects;
    private final MemoryRelationRepository relations;
    private final MemoryEventRepository events;
    private final OntologyService ontology;
    private final WorkspaceAuthorizationService authorization;
    private final ConversationAccessPolicy conversationAccess;

    public RastroService(
            MemoryObjectRepository objects,
            MemoryRelationRepository relations,
            MemoryEventRepository events,
            OntologyService ontology,
            WorkspaceAuthorizationService authorization,
            ConversationAccessPolicy conversationAccess
    ) {
        this.objects = objects;
        this.relations = relations;
        this.events = events;
        this.ontology = ontology;
        this.authorization = authorization;
        this.conversationAccess = conversationAccess;
    }

    @Transactional(readOnly = true)
    public RastroResponse get(
            String requestedWorkspaceId,
            String requestedRootType,
            String requestedRootId,
            int maxNodes,
            int maxRelations,
            int maxEvents
    ) {
        String workspaceId = authorization.requireAuthorizedWorkspace(requestedWorkspaceId);
        String rootType = requireRootType(requestedRootType);
        String rootId = requireSafeId(requestedRootId);
        requireLimit(maxNodes, 1, MAX_NODES, "maxNodes");
        requireLimit(maxRelations, 1, MAX_RELATIONS, "maxRelations");
        requireLimit(maxEvents, 1, MAX_EVENTS, "maxEvents");

        NodeKey rootKey = new NodeKey(rootType, rootId);
        StoredMemoryObject rootObject = findObject(workspaceId, rootKey);
        Graph graph = expand(workspaceId, rootObject, maxNodes, maxRelations);
        EventSet eventSet = loadEvents(workspaceId, graph.nodes, maxEvents);
        List<Stage> stages = stages(graph.nodes, eventSet.byNode, rootKey);
        Stage root = stages.stream()
                .filter(stage -> stage.reference().type().equals(rootType)
                        && stage.reference().id().equals(rootId))
                .findFirst()
                .orElseThrow();
        List<Relation> relationViews = relationViews(graph.relations);
        List<Gap> gaps = gaps(workspaceId, graph.nodes, rootKey);
        boolean truncated = graph.truncated || eventSet.truncated;

        return new RastroResponse(
                workspaceId,
                root,
                stages,
                relationViews,
                eventSet.values.stream().map(this::eventView).toList(),
                participants(graph.nodes, graph.relations),
                gaps,
                new Limits(maxNodes, maxRelations, maxEvents, truncated),
                asOf(graph, eventSet.values)
        );
    }

    private Graph expand(
            String workspaceId,
            StoredMemoryObject root,
            int maxNodes,
            int maxRelations
    ) {
        LinkedHashMap<NodeKey, StoredMemoryObject> nodes = new LinkedHashMap<>();
        List<StoredMemoryRelation> graphRelations = new ArrayList<>();
        Set<Long> seenRelations = new HashSet<>();
        ArrayDeque<NodeKey> pending = new ArrayDeque<>();
        NodeKey rootKey = key(root.getEntityType(), root.getEntityId());
        nodes.put(rootKey, root);
        pending.add(rootKey);
        boolean truncated = false;

        while (!pending.isEmpty() && graphRelations.size() < maxRelations) {
            NodeKey current = pending.removeFirst();
            List<StoredMemoryRelation> candidates = relations.findRelationsForNode(
                            workspaceId, current.type, current.id)
                    .stream()
                    .filter(StoredMemoryRelation::isActive)
                    .filter(this::isTraceRelation)
                    .filter(this::canView)
                    .sorted(Comparator.comparing(StoredMemoryRelation::getCreatedAt)
                            .thenComparing(StoredMemoryRelation::getId))
                    .toList();
            for (StoredMemoryRelation relation : candidates) {
                if (graphRelations.size() >= maxRelations) {
                    truncated = true;
                    break;
                }
                if (!seenRelations.add(relation.getId())) {
                    continue;
                }
                NodeKey origin = key(relation.getOriginType(), relation.getOriginId());
                NodeKey destination = key(relation.getDestinationType(), relation.getDestinationId());
                NodeKey other = current.equals(origin) ? destination : origin;
                if (!belongsToRootPath(rootKey, current, other)) {
                    continue;
                }
                if (!nodes.containsKey(other)) {
                    if (nodes.size() >= maxNodes) {
                        truncated = true;
                        continue;
                    }
                    StoredMemoryObject related = findObjectIfPresent(workspaceId, other);
                    if (related == null) {
                        continue;
                    }
                    nodes.put(other, related);
                    if (canExpandFrom(rootKey, other)) {
                        pending.addLast(other);
                    }
                }
                if (nodes.containsKey(origin) && nodes.containsKey(destination)) {
                    graphRelations.add(relation);
                }
            }
        }
        if (!pending.isEmpty()) {
            truncated = true;
        }
        return new Graph(nodes, graphRelations, truncated);
    }

    private boolean belongsToRootPath(NodeKey root, NodeKey current, NodeKey other) {
        return !root.type.equals(OntologyService.ACAO)
                || !current.type.equals(OntologyService.MISSAO)
                || !other.type.equals(OntologyService.ACAO)
                || other.equals(root);
    }

    private boolean canExpandFrom(NodeKey root, NodeKey node) {
        if (PARTICIPANT_TYPES.contains(node.type) || node.type.equals(OntologyService.RECURSO)) {
            return false;
        }
        return root.type.equals(OntologyService.TERRITORIO)
                || !node.type.equals(OntologyService.TERRITORIO);
    }

    private EventSet loadEvents(
            String workspaceId,
            Map<NodeKey, StoredMemoryObject> nodes,
            int maxEvents
    ) {
        List<StoredMemoryEvent> found = new ArrayList<>();
        boolean truncated = false;
        for (NodeKey node : orderedKeys(nodes.keySet())) {
            int remaining = maxEvents - found.size();
            if (remaining == 0) {
                truncated = true;
                break;
            }
            List<StoredMemoryEvent> nodeEvents = events.findEventsForNode(
                    workspaceId,
                    node.type,
                    node.id,
                    PageRequest.of(0, Math.min(remaining + 1, MAX_EVENTS + 1))
            );
            if (nodeEvents.size() > remaining) {
                truncated = true;
                nodeEvents = nodeEvents.subList(0, remaining);
            }
            found.addAll(nodeEvents);
        }
        found.sort(eventComparator());
        Map<NodeKey, List<StoredMemoryEvent>> byNode = new HashMap<>();
        for (StoredMemoryEvent event : found) {
            byNode.computeIfAbsent(key(event.getEntityType(), event.getEntityId()), ignored -> new ArrayList<>())
                    .add(event);
        }
        return new EventSet(List.copyOf(found), Map.copyOf(byNode), truncated);
    }

    private List<Stage> stages(
            Map<NodeKey, StoredMemoryObject> nodes,
            Map<NodeKey, List<StoredMemoryEvent>> eventMap,
            NodeKey root
    ) {
        return nodes.entrySet().stream()
                .filter(entry -> entry.getKey().equals(root)
                        || !PARTICIPANT_TYPES.contains(entry.getKey().type))
                .sorted(Map.Entry.comparingByKey(nodeComparator()))
                .map(entry -> stage(entry.getValue(), eventMap.getOrDefault(entry.getKey(), List.of())))
                .toList();
    }

    private Stage stage(StoredMemoryObject object, List<StoredMemoryEvent> nodeEvents) {
        StoredMemoryEvent first = nodeEvents.isEmpty() ? null : nodeEvents.getFirst();
        return new Stage(
                reference(object.getEntityType(), object.getEntityId()),
                stageName(object),
                object.getStatus(),
                first == null ? null : first.getOccurredAt(),
                first == null ? null : first.getRecordedAt(),
                first == null ? null : first.getSyncStatus()
        );
    }

    private List<Relation> relationViews(List<StoredMemoryRelation> values) {
        return values.stream()
                .sorted(Comparator
                        .comparing((StoredMemoryRelation value) -> key(value.getOriginType(), value.getOriginId()),
                                nodeComparator())
                        .thenComparing(StoredMemoryRelation::getRelationType)
                        .thenComparing(value -> key(value.getDestinationType(), value.getDestinationId()),
                                nodeComparator()))
                .map(value -> new Relation(
                        value.getRelationType(),
                        reference(value.getOriginType(), value.getOriginId()),
                        reference(value.getDestinationType(), value.getDestinationId()),
                        value.getActorId(),
                        value.getCreatedAt()
                ))
                .toList();
    }

    private List<Participant> participants(
            Map<NodeKey, StoredMemoryObject> nodes,
            List<StoredMemoryRelation> values
    ) {
        Map<String, Participant> result = new LinkedHashMap<>();
        for (StoredMemoryRelation relation : values) {
            NodeKey origin = key(relation.getOriginType(), relation.getOriginId());
            NodeKey destination = key(relation.getDestinationType(), relation.getDestinationId());
            if (PARTICIPANT_TYPES.contains(origin.type)) {
                addParticipant(result, nodes, origin, destination, relation.getRelationType());
            }
            if (PARTICIPANT_TYPES.contains(destination.type)
                    && !PARTICIPANT_TYPES.contains(origin.type)) {
                addParticipant(result, nodes, destination, origin, relation.getRelationType());
            }
        }
        return result.values().stream()
                .sorted(Comparator
                        .comparing((Participant value) -> value.participant().type())
                        .thenComparing(value -> value.participant().id())
                        .thenComparing(Participant::relationType)
                        .thenComparing(value -> value.at().type())
                        .thenComparing(value -> value.at().id()))
                .toList();
    }

    private void addParticipant(
            Map<String, Participant> result,
            Map<NodeKey, StoredMemoryObject> nodes,
            NodeKey participantKey,
            NodeKey at,
            String relationType
    ) {
        StoredMemoryObject participant = nodes.get(participantKey);
        if (participant == null || !nodes.containsKey(at)) {
            return;
        }
        String identity = participantKey.type + "\u0000" + participantKey.id + "\u0000"
                + relationType + "\u0000" + at.type + "\u0000" + at.id;
        result.putIfAbsent(identity, new Participant(
                reference(participantKey.type, participantKey.id),
                participant.getName(),
                participant.getStatus(),
                relationType,
                reference(at.type, at.id)
        ));
    }

    private List<Gap> gaps(
            String workspaceId,
            Map<NodeKey, StoredMemoryObject> nodes,
            NodeKey root
    ) {
        List<Gap> result = new ArrayList<>();
        for (NodeKey subject : orderedKeys(nodes.keySet())) {
            if (PARTICIPANT_TYPES.contains(subject.type) && !subject.equals(root)) {
                continue;
            }
            if (!events.existsByWorkspaceIdAndEntityTypeIgnoreCaseAndEntityId(
                    workspaceId, subject.type, subject.id)) {
                result.add(gap(
                        "REGISTRO_SEM_EVENTO", subject,
                        "O objeto não possui evento de origem na memória operacional.",
                        "Revisar o registro no módulo de origem.", null));
            }
            switch (subject.type) {
                case "TERRITORIO" -> territoryGaps(workspaceId, subject, result);
                case "MISSAO" -> missionGaps(workspaceId, subject, result);
                case "ACAO" -> actionGaps(workspaceId, subject, result);
                case "RESULTADO" -> resultGaps(workspaceId, subject, result);
                case "INDICADOR" -> indicatorGaps(workspaceId, subject, result);
                default -> {
                }
            }
        }
        result.sort(Comparator.comparing(Gap::code)
                .thenComparing(value -> value.subject().type())
                .thenComparing(value -> value.subject().id()));
        return List.copyOf(result);
    }

    private void territoryGaps(String workspaceId, NodeKey subject, List<Gap> result) {
        boolean hasOrigin = existsTo(workspaceId, subject, "OBSERVACAO", "OCORRE_EM")
                || existsTo(workspaceId, subject, "PROBLEMA", "AFETA")
                || existsTo(workspaceId, subject, "POTENCIALIDADE", "EXISTE_EM")
                || existsTo(workspaceId, subject, "MISSAO", "ATUA_EM");
        if (!hasOrigin) {
            result.add(gap(
                    "TERRITORIO_SEM_ORIGEM", subject,
                    "Nenhuma observação, potencialidade, problema ou missão está ligada ao território.",
                    "Registrar ou vincular uma origem territorial.",
                    expected("OBSERVACAO", "OCORRE_EM", "TERRITORIO")));
        }
    }

    private void missionGaps(String workspaceId, NodeKey subject, List<Gap> result) {
        if (!existsFrom(workspaceId, subject, "TERRITORIO", "ATUA_EM")) {
            result.add(gap(
                    "MISSAO_SEM_TERRITORIO", subject,
                    "A missão não possui vínculo territorial direto.",
                    "Vincular a missão ao território em que atua.",
                    expected("MISSAO", "ATUA_EM", "TERRITORIO")));
        }
        if (!existsFrom(workspaceId, subject, "ACAO", "COMPOSTA_POR")) {
            result.add(gap(
                    "MISSAO_SEM_ACAO", subject,
                    "A missão ainda não possui ação vinculada.",
                    "Registrar ou vincular uma ação da missão.",
                    expected("MISSAO", "COMPOSTA_POR", "ACAO")));
        }
    }

    private void actionGaps(String workspaceId, NodeKey subject, List<Gap> result) {
        if (!actionHasTerritory(workspaceId, subject)) {
            result.add(gap(
                    "ACAO_SEM_TERRITORIO", subject,
                    "A ação não está ligada a uma missão com território explícito.",
                    "Vincular a missão da ação ao território em que o trabalho acontece.",
                    expected("MISSAO", "ATUA_EM", "TERRITORIO")));
        }
        if (!existsTo(workspaceId, subject, "MISSAO", "COMPOSTA_POR")) {
            result.add(gap(
                    "ACAO_SEM_MISSAO", subject,
                    "A ação não está vinculada a uma missão.",
                    "Vincular a ação à missão correspondente.",
                    expected("MISSAO", "COMPOSTA_POR", "ACAO")));
        }
        if (!existsFrom(workspaceId, subject, "EVIDENCIA", "GERA")) {
            result.add(gap(
                    "ACAO_SEM_EVIDENCIA", subject,
                    "A ação não possui evidência registrada.",
                    "Registrar uma evidência produzida pela ação.",
                    expected("ACAO", "GERA", "EVIDENCIA")));
        }
        if (!existsFrom(workspaceId, subject, "RESULTADO", "PRODUZ")) {
            result.add(gap(
                    "ACAO_SEM_RESULTADO", subject,
                    "A ação não possui resultado registrado.",
                    "Registrar o resultado observado da ação.",
                    expected("ACAO", "PRODUZ", "RESULTADO")));
        }
        boolean hasAuthor = existsTo(workspaceId, subject, "PESSOA", "RESPONSAVEL_POR")
                || events.existsAuthoredEvent(workspaceId, subject.type, subject.id);
        if (!hasAuthor) {
            result.add(gap(
                    "ACAO_SEM_AUTORIA", subject,
                    "A ação não possui responsável nem evento com autoria.",
                    "Identificar a pessoa responsável pela ação.",
                    expected("PESSOA", "RESPONSAVEL_POR", "ACAO")));
        }
    }

    private boolean actionHasTerritory(String workspaceId, NodeKey action) {
        return relations.findRelationsForNode(workspaceId, action.type, action.id).stream()
                .filter(StoredMemoryRelation::isActive)
                .filter(relation -> "COMPOSTA_POR".equals(relation.getRelationType()))
                .filter(relation -> "MISSAO".equals(relation.getOriginType()))
                .filter(relation -> action.id.equals(relation.getDestinationId()))
                .anyMatch(relation -> relations.existsActiveFrom(
                        workspaceId,
                        "MISSAO",
                        relation.getOriginId(),
                        "TERRITORIO",
                        "ATUA_EM"
                ));
    }

    private void resultGaps(String workspaceId, NodeKey subject, List<Gap> result) {
        if (!existsTo(workspaceId, subject, "EVIDENCIA", "SUSTENTA")) {
            result.add(gap(
                    "RESULTADO_SEM_EVIDENCIA", subject,
                    "O resultado não possui evidência que o sustente.",
                    "Vincular uma evidência específica ao resultado.",
                    expected("EVIDENCIA", "SUSTENTA", "RESULTADO")));
        }
        if (!existsTo(workspaceId, subject, "INDICADOR", "MEDE")) {
            result.add(gap(
                    "RESULTADO_SEM_INDICADOR", subject,
                    "O resultado não possui indicador vinculado.",
                    "Vincular um indicador adequado ao resultado.",
                    expected("INDICADOR", "MEDE", "RESULTADO")));
        }
    }

    private void indicatorGaps(String workspaceId, NodeKey subject, List<Gap> result) {
        if (!existsTo(workspaceId, subject, "MEDICAO", "REFERE_SE_A")) {
            result.add(gap(
                    "INDICADOR_SEM_MEDICAO", subject,
                    "O indicador ainda não possui medição válida.",
                    "Registrar uma medição vinculada ao indicador.",
                    expected("MEDICAO", "REFERE_SE_A", "INDICADOR")));
        }
    }

    private boolean existsFrom(
            String workspaceId,
            NodeKey subject,
            String destinationType,
            String relationType
    ) {
        return relations.existsActiveFrom(
                workspaceId, subject.type, subject.id, destinationType, relationType);
    }

    private boolean existsTo(
            String workspaceId,
            NodeKey subject,
            String originType,
            String relationType
    ) {
        return relations.existsActiveTo(
                workspaceId, subject.type, subject.id, originType, relationType);
    }

    private Gap gap(
            String code,
            NodeKey subject,
            String reason,
            String nextAction,
            ExpectedRelation expected
    ) {
        return new Gap(code, reference(subject.type, subject.id), reason, nextAction, expected);
    }

    private ExpectedRelation expected(String origin, String relation, String destination) {
        return new ExpectedRelation(origin, relation, destination);
    }

    private Event eventView(StoredMemoryEvent value) {
        return new Event(
                value.getEventId(),
                value.getEventType(),
                reference(value.getEntityType(), value.getEntityId()),
                value.getActorId(),
                value.getOccurredAt(),
                value.getRecordedAt(),
                value.getSyncStatus()
        );
    }

    private Instant asOf(Graph graph, List<StoredMemoryEvent> eventValues) {
        Instant latest = graph.nodes.values().stream()
                .map(StoredMemoryObject::getUpdatedAt)
                .max(Instant::compareTo)
                .orElse(Instant.EPOCH);
        for (StoredMemoryRelation relation : graph.relations) {
            if (relation.getCreatedAt().isAfter(latest)) {
                latest = relation.getCreatedAt();
            }
        }
        for (StoredMemoryEvent event : eventValues) {
            Instant recorded = event.getRecordedAt() == null ? event.getOccurredAt() : event.getRecordedAt();
            if (recorded != null && recorded.isAfter(latest)) {
                latest = recorded;
            }
        }
        return latest;
    }

    private StoredMemoryObject findObject(String workspaceId, NodeKey key) {
        StoredMemoryObject object = findObjectIfPresent(workspaceId, key);
        if (object == null) {
            throw new IllegalArgumentException("Raiz do Rastro não encontrada.");
        }
        return object;
    }

    private StoredMemoryObject findObjectIfPresent(String workspaceId, NodeKey key) {
        return objects.findByWorkspaceIdAndEntityTypeIgnoreCaseAndEntityId(
                        workspaceId, key.type, key.id)
                .stream()
                .min(Comparator.comparing(StoredMemoryObject::getId))
                .orElse(null);
    }

    private boolean isTraceRelation(StoredMemoryRelation relation) {
        String origin;
        String destination;
        String type;
        try {
            origin = ontology.canonicalObjectType(relation.getOriginType());
            destination = ontology.canonicalObjectType(relation.getDestinationType());
            type = ontology.canonicalRelationType(relation.getRelationType());
            ontology.requireValidRelation(origin, type, destination);
        } catch (IllegalArgumentException exception) {
            return false;
        }
        return TRACE_RELATIONS.contains(signature(origin, type, destination));
    }

    private boolean canView(StoredMemoryRelation relation) {
        return conversationAccess.canAccessMemoryNode(
                        relation.getWorkspaceId(), relation.getOriginType(), relation.getOriginId())
                && conversationAccess.canAccessMemoryNode(
                        relation.getWorkspaceId(), relation.getDestinationType(), relation.getDestinationId());
    }

    private String stageName(StoredMemoryObject object) {
        return switch (ontology.canonicalObjectType(object.getEntityType())) {
            case OntologyService.CONVERSA -> "Conversa vinculada";
            case OntologyService.MENSAGEM -> "Mensagem registrada";
            case OntologyService.ANEXO -> "Anexo registrado";
            default -> object.getName();
        };
    }

    private String requireRootType(String value) {
        String type = ontology.canonicalObjectType(value);
        if (!ROOT_TYPES.contains(type)) {
            throw new IllegalArgumentException("O tipo informado não pode iniciar um Rastro.");
        }
        return type;
    }

    private String requireSafeId(String value) {
        if (value == null || !SAFE_ID.matcher(value).matches()) {
            throw new IllegalArgumentException("Identificador de raiz inválido.");
        }
        return value;
    }

    private void requireLimit(int value, int minimum, int maximum, String name) {
        if (value < minimum || value > maximum) {
            throw new IllegalArgumentException(
                    name + " deve estar entre " + minimum + " e " + maximum + ".");
        }
    }

    private Reference reference(String type, String id) {
        String canonical = ontology.canonicalObjectType(type);
        return new Reference(canonical, id, RESOURCES.get(canonical));
    }

    private NodeKey key(String type, String id) {
        return new NodeKey(ontology.canonicalObjectType(type), id);
    }

    private List<NodeKey> orderedKeys(Set<NodeKey> keys) {
        return keys.stream().sorted(nodeComparator()).toList();
    }

    private Comparator<NodeKey> nodeComparator() {
        return Comparator.comparingInt((NodeKey value) -> STAGE_ORDER.getOrDefault(value.type, 100))
                .thenComparing(value -> value.type)
                .thenComparing(value -> value.id);
    }

    private Comparator<StoredMemoryEvent> eventComparator() {
        return Comparator.comparing(StoredMemoryEvent::getOccurredAt)
                .thenComparing(StoredMemoryEvent::getRecordedAt,
                        Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(StoredMemoryEvent::getSequence);
    }

    private static String signature(String origin, String relation, String destination) {
        return origin + "\u0000" + relation + "\u0000" + destination;
    }

    private record NodeKey(String type, String id) {
    }

    private record Graph(
            LinkedHashMap<NodeKey, StoredMemoryObject> nodes,
            List<StoredMemoryRelation> relations,
            boolean truncated
    ) {
    }

    private record EventSet(
            List<StoredMemoryEvent> values,
            Map<NodeKey, List<StoredMemoryEvent>> byNode,
            boolean truncated
    ) {
    }
}
