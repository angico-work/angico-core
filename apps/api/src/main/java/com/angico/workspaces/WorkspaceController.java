package com.angico.workspaces;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/workspaces")
public class WorkspaceController {

    private final WorkspaceService workspaceService;

    public WorkspaceController(WorkspaceService workspaceService) {
        this.workspaceService = workspaceService;
    }

    @GetMapping
    public List<WorkspaceResponse> listar() {
        return workspaceService.listar();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WorkspaceResponse criar(@Valid @RequestBody WorkspaceCreateRequest request) {
        return workspaceService.criar(request);
    }

    @PutMapping("/{slug}")
    public WorkspaceResponse atualizar(@PathVariable String slug, @RequestBody WorkspaceUpdateRequest request) {
        return workspaceService.atualizar(slug, request);
    }

    @DeleteMapping("/{slug}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remover(@PathVariable String slug) {
        workspaceService.remover(slug);
    }

    // --- Members --------------------------------------------------------------

    @GetMapping("/{slug}/members")
    public List<WorkspaceMemberResponse> membros(@PathVariable String slug) {
        return workspaceService.membros(slug);
    }

    @PostMapping("/{slug}/members")
    @ResponseStatus(HttpStatus.CREATED)
    public WorkspaceMemberResponse adicionarMembro(@PathVariable String slug, @Valid @RequestBody WorkspaceMemberRequest request) {
        return workspaceService.adicionarMembro(slug, request);
    }

    @PutMapping("/{slug}/members/{memberId}")
    public WorkspaceMemberResponse atualizarMembro(
            @PathVariable String slug,
            @PathVariable Long memberId,
            @RequestBody WorkspaceMemberRequest request
    ) {
        return workspaceService.atualizarMembro(slug, memberId, request);
    }

    @DeleteMapping("/{slug}/members/{memberId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removerMembro(@PathVariable String slug, @PathVariable Long memberId) {
        workspaceService.removerMembro(slug, memberId);
    }
}
