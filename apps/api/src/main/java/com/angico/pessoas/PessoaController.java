package com.angico.pessoas;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/pessoas")
public class PessoaController {

    private final PessoaService pessoaService;

    public PessoaController(PessoaService pessoaService) {
        this.pessoaService = pessoaService;
    }

    @GetMapping
    public List<PessoaResponse> list(@RequestParam(required = false) String workspaceId) {
        return pessoaService.list(workspaceId);
    }

    @GetMapping("/search")
    public List<PessoaResponse> search(
            @RequestParam(required = false) String workspaceId,
            @RequestParam String q
    ) {
        return pessoaService.search(workspaceId, q);
    }

    @PatchMapping("/me/angico-id")
    public PessoaResponse updateMyAngicoId(@RequestBody AngicoIdRequest request) {
        return pessoaService.updateMyAngicoId(request);
    }
}
