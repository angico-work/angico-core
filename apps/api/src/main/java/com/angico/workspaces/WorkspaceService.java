package com.angico.workspaces;

import com.angico.common.ClockProvider;
import com.angico.pessoas.AngicoIdNormalizer;
import com.angico.pessoas.Pessoa;
import com.angico.pessoas.PessoaRepository;
import java.text.Normalizer;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WorkspaceService {

    static final Set<String> ROLES = Set.of("OWNER", "ADMIN", "COORDINATOR", "MAPPER", "MEMBER", "VIEWER");
    static final Set<String> MEMBER_STATUSES = Set.of("ACTIVE", "INACTIVE");

    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository memberRepository;
    private final PessoaRepository pessoaRepository;
    private final WorkspaceAccessService accessService;
    private final WorkspaceAuthorizationService authorizationService;
    private final WorkspaceMemoryPublisher memoryPublisher;
    private final ClockProvider clock;

    public WorkspaceService(
            WorkspaceRepository workspaceRepository,
            WorkspaceMemberRepository memberRepository,
            PessoaRepository pessoaRepository,
            WorkspaceAccessService accessService,
            WorkspaceAuthorizationService authorizationService,
            WorkspaceMemoryPublisher memoryPublisher,
            ClockProvider clock
    ) {
        this.workspaceRepository = workspaceRepository;
        this.memberRepository = memberRepository;
        this.pessoaRepository = pessoaRepository;
        this.accessService = accessService;
        this.authorizationService = authorizationService;
        this.memoryPublisher = memoryPublisher;
        this.clock = clock;
    }

    @Transactional
    public List<WorkspaceResponse> listar() {
        Set<String> authorized = Set.copyOf(authorizationService.authorizedWorkspaceIds());
        return workspaceRepository.findAllByOrderByCreatedAtAsc()
                .stream()
                .filter(workspace -> authorized.contains(workspace.getSlug()))
                .filter(workspace -> "ACTIVE".equalsIgnoreCase(workspace.getStatus()))
                .map(WorkspaceResponse::from)
                .toList();
    }

    @Transactional
    public WorkspaceResponse criar(WorkspaceCreateRequest request) {
        validateCoordinatePair(request.centerLatitude(), request.centerLongitude());
        String actorId = authorizationService.currentActorId();
        Instant now = clock.now();
        Workspace workspace = new Workspace(uniqueSlug(slugify(request.nome().trim())),
                request.nome().trim(), actorId, now);
        workspace.setDescricao(blankToNull(request.descricao()));
        workspace.setCidade(blankToNull(request.cidade()));
        workspace.setEstado(blankToNull(request.estado()));
        workspace.setCenterLatitude(request.centerLatitude());
        workspace.setCenterLongitude(request.centerLongitude());
        Workspace saved = workspaceRepository.save(workspace);

        memoryPublisher.publicarCriado(saved, actorId);

        String displayName = accessService.currentActorName().orElse(actorId);
        WorkspaceMember owner = memberRepository.save(
                new WorkspaceMember(saved.getSlug(), actorId, displayName, "OWNER", "ACTIVE", now));
        memoryPublisher.publicarMembroAdicionado(owner, actorId);

        return WorkspaceResponse.from(saved);
    }

    @Transactional
    public WorkspaceResponse atualizar(String slug, WorkspaceUpdateRequest request) {
        accessService.requireManage(slug);
        validateCoordinatePair(request.centerLatitude(), request.centerLongitude());
        Workspace workspace = workspaceRepository.findBySlug(slug)
                .orElseThrow(() -> new IllegalArgumentException("Workspace não encontrado: " + slug));
        if (request.nome() != null && !request.nome().isBlank()) {
            workspace.setNome(request.nome().trim());
        }
        if (request.descricao() != null) {
            workspace.setDescricao(blankToNull(request.descricao()));
        }
        if (request.cidade() != null) {
            workspace.setCidade(blankToNull(request.cidade()));
        }
        if (request.estado() != null) {
            workspace.setEstado(blankToNull(request.estado()));
        }
        if (request.centerLatitude() != null && request.centerLongitude() != null) {
            workspace.setCenterLatitude(request.centerLatitude());
            workspace.setCenterLongitude(request.centerLongitude());
        }
        workspace.setUpdatedAt(clock.now());
        Workspace saved = workspaceRepository.save(workspace);
        memoryPublisher.publicarAtualizado(saved, accessService.currentActorId().orElse(null));
        return WorkspaceResponse.from(saved);
    }

    @Transactional
    public void remover(String slug) {
        accessService.requireManage(slug);
        workspaceRepository.findBySlug(slug).ifPresent(workspace -> {
            workspace.setStatus("ARCHIVED");
            workspace.setUpdatedAt(clock.now());
            String actorId = accessService.currentActorId().orElse(null);
            memberRepository.findByWorkspaceIdOrderByJoinedAtAsc(slug)
                    .forEach(member -> {
                        member.setStatus("INACTIVE");
                        memoryPublisher.publicarMembroRemovido(member, actorId);
                    });
            memoryPublisher.publicarAtualizado(workspace, actorId);
        });
    }

    public List<WorkspaceMemberResponse> membros(String slug) {
        authorizationService.requireMember(slug);
        return memberRepository.findByWorkspaceIdOrderByJoinedAtAsc(slug)
                .stream()
                .map(WorkspaceMemberResponse::from)
                .toList();
    }

    @Transactional
    public WorkspaceMemberResponse adicionarMembro(String slug, WorkspaceMemberRequest request) {
        accessService.requireManage(slug);
        assertWorkspaceExists(slug);
        String actorId = AngicoIdNormalizer.normalize(request.actorId());
        Pessoa pessoa = requireActivePerson(actorId);
        memberRepository.findByWorkspaceIdAndActorId(slug, actorId).ifPresent(existing -> {
            throw new IllegalArgumentException("Esta pessoa já é membro do workspace.");
        });
        WorkspaceMember member = new WorkspaceMember(
                slug,
                actorId,
                firstNonBlank(request.displayName(), firstNonBlank(pessoa.getNome(), actorId)),
                normalizeRole(request.role()),
                normalizeStatus(request.status()),
                clock.now());
        WorkspaceMember saved = memberRepository.save(member);
        memoryPublisher.publicarMembroAdicionado(saved, accessService.currentActorId().orElse(null));
        return WorkspaceMemberResponse.from(saved);
    }

    @Transactional
    public WorkspaceMemberResponse atualizarMembro(String slug, Long memberId, WorkspaceMemberRequest request) {
        accessService.requireManage(slug);
        lockWorkspace(slug);
        WorkspaceMember member = memberRepository.findByIdAndWorkspaceId(memberId, slug)
                .orElseThrow(() -> new IllegalArgumentException("Membro não pertence ao workspace informado."));
        String nextRole = request.role() == null || request.role().isBlank()
                ? member.getRole()
                : normalizeRole(request.role());
        String nextStatus = request.status() == null || request.status().isBlank()
                ? member.getStatus()
                : normalizeStatus(request.status());
        assertActiveOwnerRemains(slug, member, nextRole, nextStatus);
        if (request.displayName() != null && !request.displayName().isBlank()) {
            member.setDisplayName(request.displayName().trim());
        }
        member.setRole(nextRole);
        member.setStatus(nextStatus);
        WorkspaceMember saved = memberRepository.save(member);
        memoryPublisher.publicarMembroAtualizado(saved, accessService.currentActorId().orElse(null));
        return WorkspaceMemberResponse.from(saved);
    }

    @Transactional
    public void removerMembro(String slug, Long memberId) {
        accessService.requireManage(slug);
        lockWorkspace(slug);
        memberRepository.findByIdAndWorkspaceId(memberId, slug).ifPresent(member -> {
            assertActiveOwnerRemains(slug, member, null, null);
            memberRepository.delete(member);
            memoryPublisher.publicarMembroRemovido(member, accessService.currentActorId().orElse(null));
        });
    }

    private void assertWorkspaceExists(String slug) {
        if (workspaceRepository.findBySlug(slug).isEmpty()) {
            throw new IllegalArgumentException("Workspace não encontrado: " + slug);
        }
    }

    private void lockWorkspace(String slug) {
        workspaceRepository.findBySlugForUpdate(slug)
                .orElseThrow(() -> new IllegalArgumentException("Workspace não encontrado: " + slug));
    }

    private String uniqueSlug(String base) {
        String root = base.isBlank() ? "workspace" : base;
        String candidate = root;
        int suffix = 2;
        while (workspaceRepository.existsBySlug(candidate)) {
            candidate = root + "-" + suffix++;
        }
        return candidate;
    }

    static String slugify(String input) {
        String folded = Normalizer.normalize(input, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return folded.toLowerCase(java.util.Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-+|-+$)", "");
    }

    private String normalizeRole(String role) {
        String normalized = (role == null || role.isBlank() ? "MEMBER" : role.trim()).toUpperCase(java.util.Locale.ROOT);
        if (!ROLES.contains(normalized)) {
            throw new IllegalArgumentException("Papel inválido: " + role);
        }
        return normalized;
    }

    private String normalizeStatus(String status) {
        String normalized = (status == null || status.isBlank() ? "ACTIVE" : status.trim())
                .toUpperCase(java.util.Locale.ROOT);
        if (!MEMBER_STATUSES.contains(normalized)) {
            throw new IllegalArgumentException("Status de membro inválido: " + status);
        }
        return normalized;
    }

    private Pessoa requireActivePerson(String actorId) {
        Pessoa pessoa = pessoaRepository.findByAngicoIdIgnoreCase(actorId)
                .orElseThrow(() -> new IllegalArgumentException("Pessoa não encontrada para o Angico ID informado."));
        String persistedActorId;
        try {
            persistedActorId = AngicoIdNormalizer.normalize(pessoa.getAngicoId());
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Pessoa não encontrada para o Angico ID informado.");
        }
        if (!actorId.equals(persistedActorId)) {
            throw new IllegalArgumentException("Pessoa não encontrada para o Angico ID informado.");
        }
        if (!"ATIVA".equalsIgnoreCase(pessoa.getStatus())) {
            throw new IllegalArgumentException("Somente pessoas ativas podem entrar no workspace.");
        }
        return pessoa;
    }

    private void assertActiveOwnerRemains(
            String workspaceId,
            WorkspaceMember member,
            String nextRole,
            String nextStatus
    ) {
        if (!isActiveOwner(member)) {
            return;
        }
        boolean remainsActiveOwner = "OWNER".equals(nextRole) && "ACTIVE".equals(nextStatus);
        if (remainsActiveOwner) {
            return;
        }
        long activeOwners = memberRepository.findByWorkspaceIdOrderByJoinedAtAsc(workspaceId).stream()
                .filter(this::isActiveOwner)
                .count();
        if (activeOwners <= 1) {
            throw new IllegalArgumentException("O workspace precisa manter ao menos um OWNER ativo.");
        }
    }

    private boolean isActiveOwner(WorkspaceMember member) {
        return "OWNER".equals(member.getRole()) && "ACTIVE".equals(member.getStatus());
    }

    private static String firstNonBlank(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private static void validateCoordinatePair(Double latitude, Double longitude) {
        if ((latitude == null) != (longitude == null)
                || latitude != null && (!Double.isFinite(latitude) || !Double.isFinite(longitude)
                || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180)) {
            throw new IllegalArgumentException("Coordenadas centrais inválidas.");
        }
    }
}
