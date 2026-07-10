package com.angico.core.history;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import com.angico.core.memory.MemoryQuery;
import com.angico.core.memory.MemoryQueryService;
import com.angico.workspaces.WorkspaceAuthorizationService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/history")
public class HistoryController {

    private final MemoryQueryService memoryQueryService;
    private final WorkspaceAuthorizationService authorizationService;

    public HistoryController(
            MemoryQueryService memoryQueryService,
            WorkspaceAuthorizationService authorizationService
    ) {
        this.memoryQueryService = memoryQueryService;
        this.authorizationService = authorizationService;
    }

    @GetMapping("/workspaces/{workspaceId}")
    public List<Map<String, Object>> workspaceTimeline(
            @PathVariable String workspaceId,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) String entityId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(required = false) String eventType,
            @RequestParam(required = false) String actorId,
            @RequestParam(required = false) String source,
            @RequestParam(required = false) String syncStatus
    ) {
        String authorizedWorkspace = authorizationService.requireAuthorizedWorkspace(workspaceId);
        return memoryQueryService.timeline(new MemoryQuery(
                authorizedWorkspace,
                entityType,
                entityId,
                from,
                to,
                eventType,
                actorId,
                source,
                syncStatus
        ));
    }
}
