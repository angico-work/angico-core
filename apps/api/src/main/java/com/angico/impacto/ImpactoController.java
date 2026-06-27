package com.angico.impacto;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/impacto")
public class ImpactoController {

    private final ImpactoService impactoService;

    public ImpactoController(ImpactoService impactoService) {
        this.impactoService = impactoService;
    }
}
