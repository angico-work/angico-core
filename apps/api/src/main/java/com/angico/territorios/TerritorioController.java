package com.angico.territorios;

import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/territorios")
public class TerritorioController {

    private final TerritorioService territorioService;

    public TerritorioController(TerritorioService territorioService) {
        this.territorioService = territorioService;
    }

    @GetMapping
    public List<TerritorioResponse> list(
            @RequestParam(required = false) String workspaceId
    ) {
        return territorioService.list(workspaceId);
    }

    @PostMapping
    public TerritorioResponse create(@RequestBody TerritorioCreateRequest request) {
        return territorioService.create(request);
    }

    @GetMapping("/{id}")
    public TerritorioResponse get(@PathVariable Long id) {
        return territorioService.get(id);
    }

    @GetMapping("/{id}/dashboard")
    public Map<String, Object> dashboard(@PathVariable Long id) {
        return territorioService.dashboard(id);
    }

    @GetMapping("/{id}/timeline")
    public List<Map<String, Object>> timeline(@PathVariable Long id) {
        return territorioService.timeline(id);
    }

    @GetMapping("/{id}/graph")
    public Map<String, Object> graph(@PathVariable Long id) {
        return territorioService.graph(id);
    }
}
