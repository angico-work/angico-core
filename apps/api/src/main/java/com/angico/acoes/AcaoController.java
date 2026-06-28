package com.angico.acoes;

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
@RequestMapping("/api/acoes")
public class AcaoController {

    private final AcaoService acaoService;

    public AcaoController(AcaoService acaoService) {
        this.acaoService = acaoService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AcaoResponse registrar(@Valid @RequestBody AcaoCreateRequest request) {
        return acaoService.registrar(request);
    }

    @GetMapping
    public List<AcaoResponse> listar(@RequestParam String workspaceId) {
        return acaoService.listar(workspaceId);
    }
}
