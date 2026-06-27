package com.angico.glimpse;

import java.util.Map;

import com.angico.territorios.TerritorioService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/glimpse")
public class GlimpseController {

    private final TerritorioService territorioService;

    public GlimpseController(TerritorioService territorioService) {
        this.territorioService = territorioService;
    }

    @GetMapping("/dashboard")
    public Map<String, Object> dashboard() {
        return territorioService.dashboard(territorioService.defaultTerritory().getId());
    }
}
