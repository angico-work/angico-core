package com.angico.recursos;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/recursos")
public class RecursoController {

    private final RecursoService service;

    public RecursoController(RecursoService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Recurso create(@Valid @RequestBody RecursoRequest request) {
        return service.create(request);
    }

    @GetMapping
    public List<Recurso> list(@RequestParam(required = false) String workspaceId) {
        return service.list(workspaceId);
    }

    @PostMapping("/{id}/usos")
    @ResponseStatus(HttpStatus.CREATED)
    public UsoRecurso use(@PathVariable Long id, @Valid @RequestBody UsoRecursoRequest request) {
        return service.use(id, request);
    }

    @GetMapping("/{id}/usos")
    public List<UsoRecurso> usages(
            @PathVariable Long id,
            @RequestParam(required = false) String workspaceId
    ) {
        return service.usages(id, workspaceId);
    }
}
