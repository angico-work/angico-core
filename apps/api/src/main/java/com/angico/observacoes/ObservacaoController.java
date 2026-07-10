package com.angico.observacoes;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/observacoes")
public class ObservacaoController {

    private final ObservacaoService observacaoService;

    public ObservacaoController(ObservacaoService observacaoService) {
        this.observacaoService = observacaoService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ObservacaoResponse registrar(
            @Valid @RequestBody ObservacaoCreateRequest request,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey
    ) {
        return observacaoService.registrar(request, idempotencyKey);
    }

    @GetMapping
    public List<ObservacaoResponse> listar(@RequestParam String workspaceId) {
        return observacaoService.listar(workspaceId);
    }
}
