package com.angico.impacto;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/indicadores")
public class IndicadorController {

    private final ImpactoService impactoService;

    public IndicadorController(ImpactoService impactoService) {
        this.impactoService = impactoService;
    }

    @GetMapping
    public List<Indicador> list(@RequestParam(required = false) String workspaceId) {
        return impactoService.indicadores(workspaceId);
    }

    @PostMapping
    public Indicador create(@RequestBody IndicadorRequest request) {
        return impactoService.createIndicador(request);
    }
}
