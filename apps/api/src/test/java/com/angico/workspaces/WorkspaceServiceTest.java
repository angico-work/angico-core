package com.angico.workspaces;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.angico.common.ClockProvider;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Unit tests for the workspace registry that underpins per-workspace data
 * isolation: every observação/problema/potencialidade/mensagem is partitioned by
 * the slug minted here. The repository is a stateful in-memory fake, so the real
 * slug/seed/guard logic runs without touching a database.
 */
class WorkspaceServiceTest {

    private List<Workspace> store;
    private WorkspaceService service;

    @BeforeEach
    void setUp() {
        store = new ArrayList<>();
        WorkspaceRepository repository = mock(WorkspaceRepository.class);
        when(repository.save(any(Workspace.class))).thenAnswer(call -> {
            Workspace workspace = call.getArgument(0);
            store.add(workspace);
            return workspace;
        });
        when(repository.existsBySlug(anyString())).thenAnswer(call ->
                store.stream().anyMatch(w -> w.getSlug().equals(call.getArgument(0))));
        when(repository.findAllByOrderByCreatedAtAsc()).thenReturn(store);
        when(repository.findBySlug(anyString())).thenAnswer(call ->
                store.stream().filter(w -> w.getSlug().equals(call.getArgument(0))).findFirst());
        doAnswer(call -> {
            store.remove(call.getArgument(0));
            return null;
        }).when(repository).delete(any(Workspace.class));

        service = new WorkspaceService(repository, new ClockProvider());
    }

    @Test
    void listingSeedsTheHomeWorkspace() {
        List<WorkspaceResponse> list = service.listar();
        assertTrue(list.stream().anyMatch(w -> "coletivo-jardim-novo".equals(w.slug())),
                "the home workspace should always be present");
    }

    @Test
    void creatingMintsAnAccentFoldedSlugFromTheName() {
        WorkspaceResponse created = service.criar(new WorkspaceCreateRequest("Mutirão da Horta", "Júlia (@julia)"));
        assertEquals("mutirao-da-horta", created.slug());
        assertEquals("Mutirão da Horta", created.nome());
        assertEquals("Júlia (@julia)", created.createdBy());
    }

    @Test
    void duplicateNamesGetDistinctSlugsSoDataNeverCollides() {
        WorkspaceResponse first = service.criar(new WorkspaceCreateRequest("Horta", null));
        WorkspaceResponse second = service.criar(new WorkspaceCreateRequest("Horta", null));
        assertEquals("horta", first.slug());
        assertEquals("horta-2", second.slug());
    }

    @Test
    void removingDropsTheWorkspaceFromTheRegistry() {
        WorkspaceResponse created = service.criar(new WorkspaceCreateRequest("Temporário", null));
        service.remover(created.slug());
        assertFalse(service.listar().stream().anyMatch(w -> created.slug().equals(w.slug())));
    }

    @Test
    void theHomeWorkspaceIsProtectedFromRemoval() {
        assertThrows(IllegalArgumentException.class, () -> service.remover("coletivo-jardim-novo"));
    }

    @Test
    void slugifyFoldsAccentsLowercasesAndCollapsesSymbols() {
        assertEquals("acao-comunitaria", WorkspaceService.slugify("  Ação  Comunitária! "));
    }
}
