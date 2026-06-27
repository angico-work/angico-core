package com.angico.observacoes;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/observacoes")
public class ObservacaoController {

    private final ObservacaoService observacaoService;

    public ObservacaoController(ObservacaoService observacaoService) {
        this.observacaoService = observacaoService;
    }
}
