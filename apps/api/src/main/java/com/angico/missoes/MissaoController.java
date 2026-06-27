package com.angico.missoes;

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
@RequestMapping("/api/missoes")
public class MissaoController {

    private final MissaoService missaoService;

    public MissaoController(MissaoService missaoService) {
        this.missaoService = missaoService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MissaoResponse registrar(@Valid @RequestBody MissaoRequest request) {
        return missaoService.registrar(request);
    }

    @GetMapping
    public List<MissaoResponse> listar(@RequestParam String workspaceId) {
        return missaoService.listar(workspaceId);
    }
}
