package com.angico.missoes;

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
@RequestMapping("/api/missoes")
public class MissaoController {

    private final MissaoService missaoService;

    public MissaoController(MissaoService missaoService) {
        this.missaoService = missaoService;
    }

<<<<<<< HEAD
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MissaoResponse registrar(@Valid @RequestBody MissaoRequest request) {
        return missaoService.registrar(request);
    }

    @GetMapping
    public List<MissaoResponse> listar(@RequestParam String workspaceId) {
        return missaoService.listar(workspaceId);
=======
    @GetMapping
    public List<MissaoResponse> list(@RequestParam(required = false) String workspaceId) {
        return missaoService.list(workspaceId);
    }

    @PostMapping
    public MissaoResponse create(@RequestBody MissaoRequest request) {
        return missaoService.create(request);
    }

    @GetMapping("/{id}")
    public MissaoResponse get(@PathVariable Long id) {
        return missaoService.get(id);
    }

    @PatchMapping("/{id}/iniciar")
    public MissaoResponse iniciar(@PathVariable Long id, @RequestBody MissaoRequest request) {
        return missaoService.iniciar(id, request);
    }

    @PatchMapping("/{id}/concluir")
    public MissaoResponse concluir(@PathVariable Long id, @RequestBody MissaoRequest request) {
        return missaoService.concluir(id, request);
>>>>>>> origin
    }
}
