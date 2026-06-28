package com.angico.observacoes;

<<<<<<< HEAD
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
=======
import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
>>>>>>> origin
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
<<<<<<< HEAD
import org.springframework.web.bind.annotation.ResponseStatus;
=======
>>>>>>> origin
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/observacoes")
public class ObservacaoController {

    private final ObservacaoService observacaoService;

    public ObservacaoController(ObservacaoService observacaoService) {
        this.observacaoService = observacaoService;
    }

<<<<<<< HEAD
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ObservacaoResponse registrar(@Valid @RequestBody ObservacaoCreateRequest request) {
        return observacaoService.registrar(request);
    }

    @GetMapping
    public List<ObservacaoResponse> listar(@RequestParam String workspaceId) {
        return observacaoService.listar(workspaceId);
=======
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
>>>>>>> origin
    }
}
