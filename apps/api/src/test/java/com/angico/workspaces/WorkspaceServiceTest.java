package com.angico.workspaces;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.angico.common.ClockProvider;
import com.angico.pessoas.Pessoa;
import com.angico.pessoas.PessoaRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class WorkspaceServiceTest {

    private List<Workspace> workspaceStore;
    private List<WorkspaceMember> memberStore;
    private List<Pessoa> pessoaStore;
    private WorkspaceRepository workspaceRepository;
    private WorkspaceMemoryPublisher memoryPublisher;
    private WorkspaceService service;

    @BeforeEach
    void setUp() {
        workspaceStore = new ArrayList<>();
        memberStore = new ArrayList<>();
        pessoaStore = new ArrayList<>();
        pessoaStore.add(person("maria.sp", "Maria", "ATIVA"));
        pessoaStore.add(person("ana.sp", "Ana", "ATIVA"));
        pessoaStore.add(person("bia.sp", "Bia", "INATIVA"));

        workspaceRepository = mock(WorkspaceRepository.class);
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
        when(workspaceRepository.findBySlugForUpdate(anyString())).thenAnswer(call ->
                workspaceStore.stream().filter(w -> w.getSlug().equals(call.getArgument(0))).findFirst());
        doAnswer(call -> {
            workspaceStore.remove(call.getArgument(0));
            return null;
        }).when(workspaceRepository).delete(any(Workspace.class));

        WorkspaceMemberRepository memberRepository = mock(WorkspaceMemberRepository.class);
        AtomicLong memberId = new AtomicLong(1);
        when(memberRepository.save(any(WorkspaceMember.class))).thenAnswer(call -> {
            WorkspaceMember member = call.getArgument(0);
            if (member.getId() == null) {
                ReflectionTestUtils.setField(member, "id", memberId.getAndIncrement());
            }
            if (!memberStore.contains(member)) {
                memberStore.add(member);
            }
            return member;
        });
        when(memberRepository.findByWorkspaceIdOrderByJoinedAtAsc(anyString())).thenAnswer(call ->
                memberStore.stream().filter(m -> m.getWorkspaceId().equals(call.getArgument(0))).toList());
        when(memberRepository.findByWorkspaceIdAndActorId(anyString(), anyString())).thenAnswer(call ->
                memberStore.stream()
                        .filter(m -> m.getWorkspaceId().equals(call.getArgument(0)) && m.getActorId().equals(call.getArgument(1)))
                        .findFirst());
        when(memberRepository.findByIdAndWorkspaceId(any(), anyString())).thenAnswer(call ->
                memberStore.stream()
                        .filter(m -> m.getId().equals(call.getArgument(0))
                                && m.getWorkspaceId().equals(call.getArgument(1)))
                        .findFirst());
        doAnswer(call -> {
            memberStore.remove(call.getArgument(0));
            return null;
        }).when(memberRepository).delete(any(WorkspaceMember.class));

        PessoaRepository pessoaRepository = mock(PessoaRepository.class);
        when(pessoaRepository.findByAngicoIdIgnoreCase(anyString())).thenAnswer(call ->
                pessoaStore.stream()
                        .filter(pessoa -> pessoa.getAngicoId().equalsIgnoreCase(call.getArgument(0)))
                        .findFirst());

        WorkspaceAccessService accessService = mock(WorkspaceAccessService.class);
        when(accessService.currentActorId()).thenReturn(Optional.of("test.actor"));
        when(accessService.currentActorName()).thenReturn(Optional.of("Test Actor"));

        WorkspaceAuthorizationService authorizationService = mock(WorkspaceAuthorizationService.class);
        when(authorizationService.currentActorId()).thenReturn("test.actor");
        when(authorizationService.authorizedWorkspaceIds()).thenAnswer(call ->
                workspaceStore.stream().map(Workspace::getSlug).toList());

        memoryPublisher = mock(WorkspaceMemoryPublisher.class);

        service = new WorkspaceService(
                workspaceRepository,
                memberRepository,
                pessoaRepository,
                accessService,
                authorizationService,
                memoryPublisher,
                new ClockProvider());
    }

    private Pessoa person(String angicoId, String nome, String status) {
        Pessoa pessoa = new Pessoa("pessoas", nome, "MEMBER", Instant.parse("2026-07-10T12:00:00Z"));
        pessoa.setAngicoId(angicoId);
        pessoa.setStatus(status);
        return pessoa;
    }

    private WorkspaceResponse create(String nome, String criadoPor) {
        return service.criar(new WorkspaceCreateRequest(nome, null, null, null, null, null, criadoPor));
    }

    @Test
    void listingDoesNotCreateImplicitWorkspaces() {
        assertTrue(service.listar().isEmpty());
    }

    @Test
    void creatingMintsAnAccentFoldedSlugFromTheName() {
        WorkspaceResponse created = create("Mutirão da Horta", "forged.actor");
        assertEquals("mutirao-da-horta", created.slug());
        assertEquals("Mutirão da Horta", created.nome());
        assertEquals("test.actor", created.createdBy());
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
        WorkspaceMember owner = memberStore.getFirst();
        service.remover(created.slug());
        assertFalse(service.listar().stream().anyMatch(w -> created.slug().equals(w.slug())));
        assertEquals("ARCHIVED", workspaceStore.getFirst().getStatus());
        assertTrue(memberStore.stream().allMatch(member -> "INACTIVE".equals(member.getStatus())));
        verify(memoryPublisher).publicarMembroRemovido(owner, "test.actor");
    }

    @Test
    void aWorkspaceNamedLikeTheLocalDemoCanBeRemoved() {
        WorkspaceResponse created = create("Coletivo Jardim Novo", null);

        service.remover(created.slug());

        assertTrue(service.listar().isEmpty());
    }

    @Test
    void archivedWorkspaceSlugIsNeverReused() {
        WorkspaceResponse archived = create("Horta Comunitária", null);
        service.remover(archived.slug());

        WorkspaceResponse replacement = create("Horta Comunitária", null);

        assertEquals("horta-comunitaria-2", replacement.slug());
    }

    @Test
    void slugifyFoldsAccentsLowercasesAndCollapsesSymbols() {
        assertEquals("acao-comunitaria", WorkspaceService.slugify("  Ação  Comunitária! "));
    }

    @Test
    void addingAMemberStoresItWithNormalizedRole() {
        String slug = create("Equipe", null).slug();
        WorkspaceMemberResponse member = service.adicionarMembro(slug,
                new WorkspaceMemberRequest("@MARIA.SP", "Maria", "coordinator", null));
        assertEquals("maria.sp", member.actorId());
        assertEquals("COORDINATOR", member.role());
        assertEquals("ACTIVE", member.status());
        assertEquals(2, service.membros(slug).size());
    }

    @Test
    void addingUsesTheExistingPersonsNameWhenDisplayNameIsBlank() {
        String slug = create("Equipe", null).slug();

        WorkspaceMemberResponse member = service.adicionarMembro(slug,
                new WorkspaceMemberRequest("maria.sp", " ", null, null));

        assertEquals("Maria", member.displayName());
    }

    @Test
    void addingAnUnknownPersonIsRejected() {
        String slug = create("Equipe", null).slug();

        assertThrows(IllegalArgumentException.class, () -> service.adicionarMembro(slug,
                new WorkspaceMemberRequest("desconhecida.sp", "Desconhecida", null, null)));
    }

    @Test
    void addingAnInactivePersonIsRejected() {
        String slug = create("Equipe", null).slug();

        assertThrows(IllegalArgumentException.class, () -> service.adicionarMembro(slug,
                new WorkspaceMemberRequest("bia.sp", "Bia", null, null)));
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

    @Test
    void anInvalidMemberStatusIsRejectedOnAddAndUpdate() {
        String slug = create("Equipe", null).slug();
        assertThrows(IllegalArgumentException.class, () -> service.adicionarMembro(slug,
                new WorkspaceMemberRequest("maria.sp", "Maria", null, "PENDING")));
        WorkspaceMemberResponse member = service.adicionarMembro(slug,
                new WorkspaceMemberRequest("maria.sp", "Maria", null, "ACTIVE"));

        assertThrows(IllegalArgumentException.class, () -> service.atualizarMembro(
                slug,
                member.id(),
                new WorkspaceMemberRequest("maria.sp", null, null, "SUSPENDED")));
    }

    @Test
    void theLastActiveOwnerCannotBeDemoted() {
        String slug = create("Equipe", null).slug();
        WorkspaceMember owner = memberStore.getFirst();

        assertThrows(IllegalArgumentException.class, () -> service.atualizarMembro(
                slug,
                owner.getId(),
                new WorkspaceMemberRequest(owner.getActorId(), null, "ADMIN", null)));
        assertEquals("OWNER", owner.getRole());
    }

    @Test
    void theLastActiveOwnerCannotBeDeactivated() {
        String slug = create("Equipe", null).slug();
        WorkspaceMember owner = memberStore.getFirst();

        assertThrows(IllegalArgumentException.class, () -> service.atualizarMembro(
                slug,
                owner.getId(),
                new WorkspaceMemberRequest(owner.getActorId(), null, null, "INACTIVE")));
        assertEquals("ACTIVE", owner.getStatus());
    }

    @Test
    void theLastActiveOwnerCannotBeRemoved() {
        String slug = create("Equipe", null).slug();
        WorkspaceMember owner = memberStore.getFirst();

        assertThrows(IllegalArgumentException.class, () -> service.removerMembro(slug, owner.getId()));
        assertTrue(memberStore.contains(owner));
    }

    @Test
    void anOwnerCanBeDemotedWhenAnotherActiveOwnerExists() {
        String slug = create("Equipe", null).slug();
        WorkspaceMember originalOwner = memberStore.getFirst();
        service.adicionarMembro(slug, new WorkspaceMemberRequest("ana.sp", "Ana", "OWNER", "ACTIVE"));

        WorkspaceMemberResponse updated = service.atualizarMembro(
                slug,
                originalOwner.getId(),
                new WorkspaceMemberRequest(originalOwner.getActorId(), null, "ADMIN", null));

        assertEquals("ADMIN", updated.role());
        verify(memoryPublisher).publicarMembroAtualizado(originalOwner, "test.actor");
    }

    @Test
    void updatingAndRemovingMembersPublishMemoryEvents() {
        String slug = create("Equipe", null).slug();
        WorkspaceMemberResponse added = service.adicionarMembro(
                slug,
                new WorkspaceMemberRequest("maria.sp", "Maria", "MEMBER", "ACTIVE"));
        WorkspaceMember member = memberStore.stream()
                .filter(candidate -> candidate.getId().equals(added.id()))
                .findFirst()
                .orElseThrow();

        service.atualizarMembro(slug, member.getId(),
                new WorkspaceMemberRequest(member.getActorId(), "Maria Silva", null, null));
        service.removerMembro(slug, member.getId());

        verify(memoryPublisher).publicarMembroAtualizado(member, "test.actor");
        verify(memoryPublisher).publicarMembroRemovido(member, "test.actor");
        assertFalse(memberStore.contains(member));
    }

    @Test
    void changingMembershipAcquiresTheWorkspaceLock() {
        String slug = create("Equipe", null).slug();
        WorkspaceMemberResponse added = service.adicionarMembro(
                slug,
                new WorkspaceMemberRequest("maria.sp", "Maria", "MEMBER", "ACTIVE"));

        service.atualizarMembro(slug, added.id(),
                new WorkspaceMemberRequest(added.actorId(), "Maria Silva", null, null));

        verify(workspaceRepository).findBySlugForUpdate(slug);
    }
}
