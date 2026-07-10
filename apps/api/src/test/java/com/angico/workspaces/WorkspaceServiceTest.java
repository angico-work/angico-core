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
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Unit tests for the workspace registry that underpins per-workspace data
 * isolation, plus the workspace membership model. The repositories are stateful
 * in-memory fakes and access control is stubbed permissive, so the real
 * slug/seed/guard/member logic runs without a database or request context.
 */
class WorkspaceServiceTest {

    private List<Workspace> workspaceStore;
    private List<WorkspaceMember> memberStore;
    private WorkspaceService service;

    @BeforeEach
    void setUp() {
        workspaceStore = new ArrayList<>();
        memberStore = new ArrayList<>();

        WorkspaceRepository workspaceRepository = mock(WorkspaceRepository.class);
        when(workspaceRepository.save(any(Workspace.class))).thenAnswer(call -> {
            Workspace workspace = call.getArgument(0);
            workspaceStore.add(workspace);
            return workspace;
        });
        when(workspaceRepository.existsBySlug(anyString())).thenAnswer(call ->
                workspaceStore.stream().anyMatch(w -> w.getSlug().equals(call.getArgument(0))));
        when(workspaceRepository.findAllByOrderByCreatedAtAsc()).thenReturn(workspaceStore);
        when(workspaceRepository.findBySlug(anyString())).thenAnswer(call ->
                workspaceStore.stream().filter(w -> w.getSlug().equals(call.getArgument(0))).findFirst());
        doAnswer(call -> {
            workspaceStore.remove(call.getArgument(0));
            return null;
        }).when(workspaceRepository).delete(any(Workspace.class));

        WorkspaceMemberRepository memberRepository = mock(WorkspaceMemberRepository.class);
        when(memberRepository.save(any(WorkspaceMember.class))).thenAnswer(call -> {
            WorkspaceMember member = call.getArgument(0);
            memberStore.add(member);
            return member;
        });
        when(memberRepository.findByWorkspaceIdOrderByJoinedAtAsc(anyString())).thenAnswer(call ->
                memberStore.stream().filter(m -> m.getWorkspaceId().equals(call.getArgument(0))).toList());
        when(memberRepository.findByWorkspaceIdAndActorId(anyString(), anyString())).thenAnswer(call ->
                memberStore.stream()
                        .filter(m -> m.getWorkspaceId().equals(call.getArgument(0)) && m.getActorId().equals(call.getArgument(1)))
                        .findFirst());

        // Permissive access (no request context in a unit test): never blocks,
        // and no authenticated actor so create() adds no owner.
        WorkspaceAccessService accessService = mock(WorkspaceAccessService.class);
        when(accessService.currentActorId()).thenReturn(Optional.of("test.actor"));
        when(accessService.currentActorName()).thenReturn(Optional.of("Test Actor"));

        WorkspaceAuthorizationService authorizationService = mock(WorkspaceAuthorizationService.class);
        when(authorizationService.currentActorId()).thenReturn("test.actor");
        when(authorizationService.authorizedWorkspaceIds()).thenAnswer(call ->
                workspaceStore.stream().map(Workspace::getSlug).toList());

        // Memory wiring is exercised at integration level; here it is a no-op.
        WorkspaceMemoryPublisher memoryPublisher = mock(WorkspaceMemoryPublisher.class);

        service = new WorkspaceService(
                workspaceRepository,
                memberRepository,
                accessService,
                authorizationService,
                memoryPublisher,
                new ClockProvider());
    }

    private WorkspaceResponse create(String nome, String criadoPor) {
        return service.criar(new WorkspaceCreateRequest(nome, null, null, null, null, null, criadoPor));
    }

    @Test
    void listingSeedsTheHomeWorkspace() {
        List<WorkspaceResponse> list = service.listar();
        assertTrue(list.stream().anyMatch(w -> "coletivo-jardim-novo".equals(w.slug())),
                "the home workspace should always be present");
    }

    @Test
    void creatingMintsAnAccentFoldedSlugFromTheName() {
        WorkspaceResponse created = create("Mutirão da Horta", "Júlia (@julia)");
        assertEquals("mutirao-da-horta", created.slug());
        assertEquals("Mutirão da Horta", created.nome());
        assertEquals("Júlia (@julia)", created.createdBy());
        assertEquals("ACTIVE", created.status());
    }

    @Test
    void duplicateNamesGetDistinctSlugsSoDataNeverCollides() {
        assertEquals("horta", create("Horta", null).slug());
        assertEquals("horta-2", create("Horta", null).slug());
    }

    @Test
    void removingDropsTheWorkspaceFromTheRegistry() {
        WorkspaceResponse created = create("Temporário", null);
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

    @Test
    void addingAMemberStoresItWithNormalizedRole() {
        String slug = create("Equipe", null).slug();
        WorkspaceMemberResponse member = service.adicionarMembro(slug,
                new WorkspaceMemberRequest("maria.sp", "Maria", "coordinator", null));
        assertEquals("maria.sp", member.actorId());
        assertEquals("COORDINATOR", member.role());
        assertEquals("ACTIVE", member.status());
        assertEquals(2, service.membros(slug).size());
    }

    @Test
    void addingTheSameMemberTwiceIsRejected() {
        String slug = create("Equipe", null).slug();
        service.adicionarMembro(slug, new WorkspaceMemberRequest("maria.sp", "Maria", null, null));
        assertThrows(IllegalArgumentException.class, () ->
                service.adicionarMembro(slug, new WorkspaceMemberRequest("maria.sp", "Maria", null, null)));
    }

    @Test
    void anInvalidRoleIsRejected() {
        String slug = create("Equipe", null).slug();
        assertThrows(IllegalArgumentException.class, () ->
                service.adicionarMembro(slug, new WorkspaceMemberRequest("ana.sp", "Ana", "BOSS", null)));
    }
}
