package com.angico.organizacoes;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/organizacoes")
public class OrganizacaoController {

    private final OrganizacaoService service;

    public OrganizacaoController(OrganizacaoService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrganizacaoResponse create(@Valid @RequestBody OrganizacaoCreateRequest request) {
        return service.create(request);
    }

    @GetMapping
    public List<OrganizacaoResponse> list(@RequestParam(required = false) String workspaceId) {
        return service.list(workspaceId);
    }

    @PostMapping("/{id}/participacoes")
    @ResponseStatus(HttpStatus.CREATED)
    public ParticipacaoResponse createParticipation(
            @PathVariable Long id,
            @Valid @RequestBody ParticipacaoRequest request
    ) {
        return service.createParticipation(id, request);
    }

    @GetMapping("/{id}/participacoes")
    public List<ParticipacaoResponse> listParticipations(
            @PathVariable Long id,
            @RequestParam(required = false) String workspaceId
    ) {
        return service.listParticipations(id, workspaceId);
    }

    @PutMapping("/{id}/participacoes/{participationId}/encerramento")
    public ParticipacaoResponse endParticipation(
            @PathVariable Long id,
            @PathVariable Long participationId,
            @Valid @RequestBody ParticipacaoEndRequest request
    ) {
        return service.endParticipation(id, participationId, request);
    }
}
