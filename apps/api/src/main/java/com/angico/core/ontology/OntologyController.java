package com.angico.core.ontology;

import java.util.List;
import java.util.Map;

import com.angico.common.CurrentActorProvider;
import com.angico.common.ForbiddenException;
import com.angico.core.memory.MemoryQueryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ontology")
public class OntologyController {

    private final OntologyService ontologyService;
    private final MemoryQueryService memoryQueryService;
    private final CurrentActorProvider currentActorProvider;

    public OntologyController(
            OntologyService ontologyService,
            MemoryQueryService memoryQueryService,
            CurrentActorProvider currentActorProvider
    ) {
        this.ontologyService = ontologyService;
        this.memoryQueryService = memoryQueryService;
        this.currentActorProvider = currentActorProvider;
    }

    @GetMapping
    public Map<String, Object> ontology() {
        if (canViewOntologyDetails()) {
            return ontologyService.describe();
        }
        return Map.of(
                "objectTypes", List.of(),
                "relations", List.of(),
                "status", "protected"
        );
    }

    @GetMapping("/validate")
    public OntologyValidationResponse validate(
            @RequestParam(defaultValue = "false") boolean details
    ) {
        OntologyValidationResponse response = ontologyService.validate();
        if (details && canViewOntologyDetails()) {
            return response;
        }
        return response.publicSummary();
    }

    @GetMapping("/graph")
    public Map<String, Object> graph(
            @RequestParam String workspaceId,
            @RequestParam String entityType,
            @RequestParam String entityId
    ) {
        ensureWorkspaceAccess(workspaceId);
        if (!canViewOntologyDetails()) {
            throw new ForbiddenException("Detalhes ontologicos protegidos.");
        }
        return memoryQueryService.graphForEntity(workspaceId, entityType, entityId);
    }

    private void ensureWorkspaceAccess(String workspaceId) {
        String actorWorkspace = currentActorProvider.currentWorkspaceId()
                .orElseThrow(() -> new ForbiddenException("Workspace protegido."));
        if (!actorWorkspace.equals(workspaceId)) {
            throw new ForbiddenException("Acesso negado ao workspace informado.");
        }
    }

    private boolean canViewOntologyDetails() {
        return currentActorProvider.currentPapel()
                .map(role -> role.equalsIgnoreCase("COORDENACAO") || role.equalsIgnoreCase("ADMIN"))
                .orElse(false);
    }
}
