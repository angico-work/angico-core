package com.angico.glimpse;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/glimpse")
public class GlimpseController {

    private final GlimpseService glimpseService;

    public GlimpseController(GlimpseService glimpseService) {
        this.glimpseService = glimpseService;
    }

    @GetMapping("/dashboard")
    public DashboardResponse dashboard(@RequestParam String workspaceId) {
        return glimpseService.dashboard(workspaceId);
    }

    @GetMapping("/map")
    public List<MapPoint> map(@RequestParam String workspaceId) {
        return glimpseService.mapPoints(workspaceId);
    }

    @GetMapping("/memoria")
    public List<MemoriaEvent> memoria(@RequestParam String workspaceId) {
        return glimpseService.memoria(workspaceId);
    }
}
