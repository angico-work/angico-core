package com.angico.glimpse;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Read-only território views consumed by the web client:
 * dashboard overview, map points, and the memória timeline.
 */
@RestController
@RequestMapping("/api/glimpse")
public class GlimpseController {

    private static final String DEFAULT_WORKSPACE = "coletivo-jardim-novo";

    private final GlimpseService glimpseService;

    public GlimpseController(GlimpseService glimpseService) {
        this.glimpseService = glimpseService;
    }

    @GetMapping("/dashboard")
    public DashboardResponse dashboard(
            @RequestParam(name = "workspaceId", defaultValue = DEFAULT_WORKSPACE) String workspaceId) {
        return glimpseService.dashboard(workspaceId);
    }

    @GetMapping("/map")
    public List<MapPoint> map(
            @RequestParam(name = "workspaceId", defaultValue = DEFAULT_WORKSPACE) String workspaceId) {
        return glimpseService.mapPoints(workspaceId);
    }

    @GetMapping("/memoria")
    public List<MemoriaEvent> memoria(
            @RequestParam(name = "workspaceId", defaultValue = DEFAULT_WORKSPACE) String workspaceId) {
        return glimpseService.memoria(workspaceId);
    }
}
