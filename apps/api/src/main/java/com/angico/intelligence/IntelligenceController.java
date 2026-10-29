package com.angico.intelligence;

import com.angico.workspaces.WorkspaceAuthorizationService;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/intelligence")
public class IntelligenceController {
    private final IntelligenceService service;
    private final IntelligenceSettings settings;
    private final WorkspaceAuthorizationService authorization;
    public IntelligenceController(IntelligenceService service,IntelligenceSettings settings,WorkspaceAuthorizationService authorization) {
        this.service=service; this.settings=settings; this.authorization=authorization;
    }
    @GetMapping("/status")
    public Map<String,Object> status(@RequestParam String workspaceId) {
        authorization.requireMember(workspaceId);
        return Map.of("available",settings.available(),"mode","on-demand","sourceLimit",20,"candidateLimitPerType",50);
    }
    @PostMapping("/analyses")
    public IntelligenceResponse analyze(@Valid @RequestBody IntelligenceRequest input) { return service.analyze(input); }
}
