package com.angico.potencialidades;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/potencialidades")
public class PotencialidadeController {

    private final PotencialidadeService potencialidadeService;

    public PotencialidadeController(PotencialidadeService potencialidadeService) {
        this.potencialidadeService = potencialidadeService;
    }
}
