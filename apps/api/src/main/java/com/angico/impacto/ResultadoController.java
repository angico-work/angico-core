package com.angico.impacto;

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
@RequestMapping("/api/resultados")
public class ResultadoController {

    private final ResultadoService service;

    public ResultadoController(ResultadoService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResultadoResponse create(@Valid @RequestBody ResultadoRequest request) {
        return service.create(request);
    }

    @GetMapping
    public List<ResultadoResponse> list(
            @RequestParam(required = false) String workspaceId,
            @RequestParam(required = false) Long acaoId
    ) {
        return service.list(workspaceId, acaoId);
    }
}
