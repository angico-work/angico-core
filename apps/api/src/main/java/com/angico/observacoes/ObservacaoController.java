package com.angico.observacoes;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/observacoes")
public class ObservacaoController {

    private final ObservacaoService observacaoService;

    public ObservacaoController(ObservacaoService observacaoService) {
        this.observacaoService = observacaoService;
    }

    @GetMapping
    public List<ObservacaoResponse> list(@RequestParam(required = false) String workspaceId) {
        return observacaoService.list(workspaceId);
    }

    @PostMapping
    public ObservacaoResponse create(@RequestBody ObservacaoCreateRequest request) {
        return observacaoService.create(request);
    }

    @GetMapping("/{id}")
    public ObservacaoResponse get(@PathVariable Long id) {
        return observacaoService.get(id);
    }

    @PatchMapping("/{id}/validar")
    public ObservacaoResponse validar(@PathVariable Long id, @RequestBody ObservacaoUpdateRequest request) {
        return observacaoService.validar(id, request);
    }

    @PatchMapping("/{id}/rejeitar")
    public ObservacaoResponse rejeitar(@PathVariable Long id, @RequestBody ObservacaoUpdateRequest request) {
        return observacaoService.rejeitar(id, request);
    }
}
