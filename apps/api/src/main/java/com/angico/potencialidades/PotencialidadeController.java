package com.angico.potencialidades;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/potencialidades")
public class PotencialidadeController {

    private final PotencialidadeService potencialidadeService;

    public PotencialidadeController(PotencialidadeService potencialidadeService) {
        this.potencialidadeService = potencialidadeService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PotencialidadeResponse registrar(@Valid @RequestBody PotencialidadeCreateRequest request) {
        return potencialidadeService.registrar(request);
    }

    @GetMapping
    public List<PotencialidadeResponse> listar(@RequestParam String workspaceId) {
        return potencialidadeService.listar(workspaceId);
    }
}
