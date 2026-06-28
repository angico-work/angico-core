package com.angico.core.history;

import java.util.List;
import java.util.Map;

import com.angico.core.memory.MemoryQueryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/history")
public class HistoryController {

    private final MemoryQueryService memoryQueryService;

    public HistoryController(MemoryQueryService memoryQueryService) {
        this.memoryQueryService = memoryQueryService;
    }

    @GetMapping("/workspaces/{workspaceId}")
    public List<Map<String, Object>> workspaceTimeline(@PathVariable String workspaceId) {
        return memoryQueryService.timelineForWorkspace(workspaceId);
    }
}
