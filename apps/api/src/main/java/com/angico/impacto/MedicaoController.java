package com.angico.impacto;

import jakarta.validation.Valid;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.ResponseStatus;

@RestController
@RequestMapping("/api/medicoes")
public class MedicaoController {

    private final ImpactoService impactoService;

    public MedicaoController(ImpactoService impactoService) {
        this.impactoService = impactoService;
    }

    @GetMapping
    public List<Medicao> list(@RequestParam(required = false) String workspaceId) {
        return impactoService.medicoes(workspaceId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Medicao create(@Valid @RequestBody MedicaoRequest request) {
        return impactoService.createMedicao(request);
    }
}
