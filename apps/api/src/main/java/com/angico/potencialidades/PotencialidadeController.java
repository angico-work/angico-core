package com.angico.potencialidades;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/potencialidades")
public class PotencialidadeController {

    private final PotencialidadeService potencialidadeService;

    public PotencialidadeController(PotencialidadeService potencialidadeService) {
        this.potencialidadeService = potencialidadeService;
    }

    @GetMapping
    public List<PotencialidadeResponse> list(@RequestParam(required = false) String workspaceId) {
        return potencialidadeService.list(workspaceId);
    }

    @PostMapping
    public PotencialidadeResponse create(@RequestBody PotencialidadeRequest request) {
        return potencialidadeService.create(request);
    }
}
