package com.angico.pessoas;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/pessoas")
public class PessoaController {

    private final PessoaService pessoaService;

    public PessoaController(PessoaService pessoaService) {
        this.pessoaService = pessoaService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PessoaResponse registrar(@Valid @RequestBody PessoaRequest request) {
        return pessoaService.registrar(request);
    }

    @GetMapping
    public List<PessoaResponse> listar(@RequestParam String workspaceId) {
        return pessoaService.listar(workspaceId);
    }

    @GetMapping("/search")
    public List<PessoaResponse> search(
            @RequestParam String workspaceId,
            @RequestParam(name = "q", required = false) String q
    ) {
        return pessoaService.search(workspaceId, q);
    }

    @GetMapping("/me")
    public PessoaResponse me() {
        return pessoaService.current();
    }

    @PutMapping("/me")
    public PessoaResponse updateMe(@Valid @RequestBody PessoaUpdateRequest request) {
        return pessoaService.updateCurrent(request);
    }
}
