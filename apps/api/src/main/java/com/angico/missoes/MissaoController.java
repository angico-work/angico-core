package com.angico.missoes;

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
@RequestMapping("/api/missoes")
public class MissaoController {

    private final MissaoService missaoService;

    public MissaoController(MissaoService missaoService) {
        this.missaoService = missaoService;
    }

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
    }
}
