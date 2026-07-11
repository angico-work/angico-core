package com.angico.recursos;

import com.angico.common.ClockProvider;
import com.angico.common.ForbiddenException;
import com.angico.core.memory.MemoryEvent;
import com.angico.core.memory.MemoryRelationMetadata;
import com.angico.core.memory.OperationalMemoryService;
import com.angico.core.ontology.OntologyService;
import com.angico.workspaces.WorkspaceAuthorizationService;
import com.angico.workspaces.WorkspaceReferenceValidator;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RecursoService {

    private static final Set<String> CATEGORIES = Set.of(
            "MATERIAL", "EQUIPAMENTO", "FINANCEIRO", "ESPACO", "SERVICO", "OUTRO");
    private static final String SOURCE = "api";

    private final RecursoRepository resourceRepository;
    private final UsoRecursoRepository usageRepository;
    private final WorkspaceAuthorizationService authorization;
    private final WorkspaceReferenceValidator references;
    private final OperationalMemoryService memory;
    private final ClockProvider clock;

    public RecursoService(
            RecursoRepository resourceRepository,
            UsoRecursoRepository usageRepository,
            WorkspaceAuthorizationService authorization,
            WorkspaceReferenceValidator references,
            OperationalMemoryService memory,
            ClockProvider clock
    ) {
        this.resourceRepository = resourceRepository;
        this.usageRepository = usageRepository;
        this.authorization = authorization;
        this.references = references;
        this.memory = memory;
        this.clock = clock;
    }

    @Transactional
    public Recurso create(RecursoRequest request) {
        String workspaceId = authorization.requireWritableWorkspace(request.workspaceId());
        String category = canonicalCategory(request.categoria());
        Instant now = clock.now();
        Recurso resource = new Recurso(
                workspaceId,
                request.nome().strip(),
                category,
                request.unidade().strip(),
                normalize(request.descricao()),
                "DISPONIVEL",
                authorization.currentActorId(),
                now
        );
        resource = resourceRepository.save(resource);
        registerResourceMemory(resource);
        return resource;
    }

    @Transactional(readOnly = true)
    public List<Recurso> list(String requestedWorkspaceId) {
        String workspaceId = authorization.requireAuthorizedWorkspace(requestedWorkspaceId);
        return resourceRepository.findByWorkspaceIdOrderByNomeAsc(workspaceId);
    }

    @Transactional
    public UsoRecurso use(Long resourceId, UsoRecursoRequest request) {
        String workspaceId = authorization.requireWritableWorkspace(request.workspaceId());
        Recurso resource = requireResource(resourceId, workspaceId);
        references.requireAcao(String.valueOf(request.acaoId()), workspaceId);
        String unit = request.unidade().strip();
        if (!resource.getUnidade().equalsIgnoreCase(unit)) {
            throw new IllegalArgumentException("A unidade do uso deve corresponder à unidade do recurso.");
        }
        Instant now = clock.now();
        Instant occurredAt = validateOccurredAt(request.occurredAt(), now);
        UsoRecurso usage = new UsoRecurso(
                workspaceId,
                resource.getId(),
                request.acaoId(),
                request.quantidade(),
                resource.getUnidade(),
                occurredAt,
                now,
                authorization.currentActorId()
        );
        usage = usageRepository.save(usage);
        registerUsageMemory(resource, usage);
        return usage;
    }

    @Transactional(readOnly = true)
    public List<UsoRecurso> usages(Long resourceId, String requestedWorkspaceId) {
        String workspaceId = authorization.requireAuthorizedWorkspace(requestedWorkspaceId);
        Recurso resource = requireResource(resourceId, workspaceId);
        return usageRepository.findByWorkspaceIdAndRecursoIdOrderByOccurredAtDesc(
                workspaceId, resource.getId());
    }

    private Recurso requireResource(Long id, String workspaceId) {
        Recurso resource = resourceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Recurso não encontrado: " + id));
        if (!workspaceId.equals(resource.getWorkspaceId())) {
            throw new ForbiddenException("Recurso fora do workspace autorizado.");
        }
        return resource;
    }

    private void registerResourceMemory(Recurso resource) {
        String resourceId = String.valueOf(resource.getId());
        memory.registrarObjeto(
                resource.getWorkspaceId(), OntologyService.RECURSO, resourceId, null,
                resource.getNome(), resource.getStatus(), SOURCE);
        memory.registrarEvento(new MemoryEvent(
                resource.getWorkspaceId(),
                OntologyService.RECURSO,
                resourceId,
                "recurso.registrado",
                SOURCE,
                resource.getActorId(),
                null,
                null,
                null,
                1,
                resource.getCreatedAt(),
                Map.of(
                        "nome", resource.getNome(),
                        "categoria", resource.getCategoria(),
                        "unidade", resource.getUnidade()
                )
        ));
    }

    private void registerUsageMemory(Recurso resource, UsoRecurso usage) {
        String usageId = String.valueOf(usage.getId());
        memory.registrarObjeto(
                usage.getWorkspaceId(), OntologyService.USO_RECURSO, usageId, null,
                "Uso de " + resource.getNome(), "REGISTRADO", SOURCE);
        memory.registrarRelacaoAtiva(
                usage.getWorkspaceId(), OntologyService.ACAO, String.valueOf(usage.getAcaoId()),
                OntologyService.RECURSO, String.valueOf(resource.getId()), "UTILIZA",
                new MemoryRelationMetadata(SOURCE, "Uso de recurso registrado", usage.getActorId(), null));
        memory.registrarEvento(new MemoryEvent(
                usage.getWorkspaceId(),
                OntologyService.USO_RECURSO,
                usageId,
                "recurso.utilizado",
                SOURCE,
                usage.getActorId(),
                null,
                null,
                null,
                1,
                usage.getOccurredAt(),
                Map.of(
                        "acaoId", usage.getAcaoId(),
                        "recursoId", usage.getRecursoId(),
                        "quantidade", usage.getQuantidade(),
                        "unidade", usage.getUnidade()
                )
        ));
    }

    private String canonicalCategory(String value) {
        String canonical = value.strip().toUpperCase(Locale.ROOT);
        if (!CATEGORIES.contains(canonical)) {
            throw new IllegalArgumentException("categoria é inválida.");
        }
        return canonical;
    }

    private Instant validateOccurredAt(Instant requested, Instant now) {
        Instant value = requested == null ? now : requested;
        if (value.isBefore(Instant.parse("2000-01-01T00:00:00Z"))
                || value.isAfter(now.plus(5, ChronoUnit.MINUTES))) {
            throw new IllegalArgumentException("occurredAt está fora do intervalo permitido.");
        }
        return value;
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }
}
