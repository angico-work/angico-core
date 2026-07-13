package com.angico.core.ontology;

import java.util.List;
import java.util.Map;

import com.angico.common.ForbiddenException;
import com.angico.core.memory.MemoryQueryService;
import com.angico.workspaces.WorkspaceAuthorizationService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.util.Set;

@RestController
@RequestMapping("/api/ontology")
public class OntologyController {

    private final OntologyService ontologyService;
    private final MemoryQueryService memoryQueryService;
    private final WorkspaceAuthorizationService authorizationService;

    public OntologyController(
            OntologyService ontologyService,
            MemoryQueryService memoryQueryService,
            WorkspaceAuthorizationService authorizationService
    ) {
        this.ontologyService = ontologyService;
        this.memoryQueryService = memoryQueryService;
        this.authorizationService = authorizationService;
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
        authorizationService.requireRole(workspaceId, Set.of("OWNER", "ADMIN", "COORDINATOR"));
        return memoryQueryService.graphForEntity(workspaceId, entityType, entityId);
    }

    private boolean canViewOntologyDetails() {
        try {
            String workspaceId = authorizationService.requireAuthorizedWorkspace(null);
            return authorizationService.hasRole(workspaceId, Set.of("OWNER", "ADMIN", "COORDINATOR"));
        } catch (ForbiddenException ex) {
            return false;
        }
    }
}
