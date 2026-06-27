package com.angico.territorios;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/territorios")
public class TerritorioController {

    private final TerritorioService territorioService;

    public TerritorioController(TerritorioService territorioService) {
        this.territorioService = territorioService;
    }
}
