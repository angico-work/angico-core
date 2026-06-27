package com.angico.acoes;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/acoes")
public class AcaoController {

    private final AcaoService acaoService;

    public AcaoController(AcaoService acaoService) {
        this.acaoService = acaoService;
    }
}
