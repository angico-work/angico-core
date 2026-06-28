package com.angico.glimpse;

<<<<<<< HEAD
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Read-only território views consumed by the web client:
 * dashboard overview, map points, and the memória timeline.
 */
=======
import java.util.Map;

import com.angico.territorios.TerritorioService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

>>>>>>> origin
@RestController
@RequestMapping("/api/glimpse")
public class GlimpseController {

<<<<<<< HEAD
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
=======
    private final TerritorioService territorioService;

    public GlimpseController(TerritorioService territorioService) {
        this.territorioService = territorioService;
    }

    @GetMapping("/dashboard")
    public Map<String, Object> dashboard() {
        return territorioService.dashboard(territorioService.defaultTerritory().getId());
>>>>>>> origin
    }
}
