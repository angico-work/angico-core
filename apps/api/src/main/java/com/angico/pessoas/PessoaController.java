package com.angico.pessoas;

<<<<<<< HEAD
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
=======
import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
>>>>>>> origin
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/pessoas")
public class PessoaController {

    private final PessoaService pessoaService;

    public PessoaController(PessoaService pessoaService) {
        this.pessoaService = pessoaService;
    }

<<<<<<< HEAD
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PessoaResponse registrar(@Valid @RequestBody PessoaRequest request) {
        return pessoaService.registrar(request);
    }

    @GetMapping
    public List<PessoaResponse> listar(@RequestParam String workspaceId) {
        return pessoaService.listar(workspaceId);
=======
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
>>>>>>> origin
    }
}
