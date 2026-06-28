package com.angico.acoes;

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
@RequestMapping("/api/acoes")
public class AcaoController {

    private final AcaoService acaoService;

    public AcaoController(AcaoService acaoService) {
        this.acaoService = acaoService;
    }

<<<<<<< HEAD
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AcaoResponse registrar(@Valid @RequestBody AcaoCreateRequest request) {
        return acaoService.registrar(request);
    }

    @GetMapping
    public List<AcaoResponse> listar(@RequestParam String workspaceId) {
        return acaoService.listar(workspaceId);
=======
    @GetMapping
    public List<AcaoResponse> list(@RequestParam(required = false) String workspaceId) {
        return acaoService.list(workspaceId);
    }

    @PostMapping
    public AcaoResponse create(@RequestBody AcaoRequest request) {
        return acaoService.create(request);
    }

    @PatchMapping("/{id}/concluir")
    public AcaoResponse concluir(@PathVariable Long id, @RequestBody AcaoRequest request) {
        return acaoService.concluir(id, request);
>>>>>>> origin
    }
}
