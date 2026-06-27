package com.angico.organizacoes;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/organizacoes")
public class OrganizacaoController {

    private final OrganizacaoService organizacaoService;

    public OrganizacaoController(OrganizacaoService organizacaoService) {
        this.organizacaoService = organizacaoService;
    }
}
