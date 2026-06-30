package com.angico.workspaces;

import com.angico.common.ClockProvider;
import java.text.Normalizer;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WorkspaceService {

    // The workspace the web app ships with — seeded so the switcher is never
    // empty and the existing território's data keeps a readable name.
    private static final String DEFAULT_SLUG = "coletivo-jardim-novo";
    private static final String DEFAULT_NOME = "Coletivo Jardim Novo";

    static final Set<String> ROLES = Set.of("OWNER", "ADMIN", "COORDINATOR", "MAPPER", "MEMBER", "VIEWER");

    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository memberRepository;
    private final WorkspaceAccessService accessService;
    private final WorkspaceMemoryPublisher memoryPublisher;
    private final ClockProvider clock;

    public WorkspaceService(
            WorkspaceRepository workspaceRepository,
            WorkspaceMemberRepository memberRepository,
            WorkspaceAccessService accessService,
            WorkspaceMemoryPublisher memoryPublisher,
            ClockProvider clock
    ) {
        this.workspaceRepository = workspaceRepository;
        this.memberRepository = memberRepository;
        this.accessService = accessService;
        this.memoryPublisher = memoryPublisher;
        this.clock = clock;
    }

    @Transactional
    public List<WorkspaceResponse> listar() {
        ensureDefault();
        return workspaceRepository.findAllByOrderByCreatedAtAsc()
                .stream()
                .map(WorkspaceResponse::from)
                .toList();
    }

    @Transactional
    public WorkspaceResponse criar(WorkspaceCreateRequest request) {
        Instant now = clock.now();
        Workspace workspace = new Workspace(uniqueSlug(slugify(request.nome().trim())),
                request.nome().trim(), blankToNull(request.criadoPor()), now);
        workspace.setDescricao(blankToNull(request.descricao()));
        workspace.setCidade(blankToNull(request.cidade()));
        workspace.setEstado(blankToNull(request.estado()));
        workspace.setCenterLatitude(request.centerLatitude());
        workspace.setCenterLongitude(request.centerLongitude());
        Workspace saved = workspaceRepository.save(workspace);

        String actorId = accessService.currentActorId().orElse(null);
        memoryPublisher.publicarCriado(saved, actorId);

        // The creator becomes the OWNER when there's an authenticated actor.
        if (actorId != null) {
            String displayName = accessService.currentActorName().orElse(actorId);
            WorkspaceMember owner = memberRepository.save(
                    new WorkspaceMember(saved.getSlug(), actorId, displayName, "OWNER", "ACTIVE", now));
            memoryPublisher.publicarMembroAdicionado(owner, actorId);
        }

        return WorkspaceResponse.from(saved);
    }

    @Transactional
    public WorkspaceResponse atualizar(String slug, WorkspaceUpdateRequest request) {
        accessService.requireManage(slug);
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
        if (request.centerLatitude() != null) {
            workspace.setCenterLatitude(request.centerLatitude());
        }
        if (request.centerLongitude() != null) {
            workspace.setCenterLongitude(request.centerLongitude());
        }
        if (request.status() != null && !request.status().isBlank()) {
            workspace.setStatus(request.status().trim().toUpperCase(java.util.Locale.ROOT));
        }
        workspace.setUpdatedAt(clock.now());
        Workspace saved = workspaceRepository.save(workspace);
        memoryPublisher.publicarAtualizado(saved, accessService.currentActorId().orElse(null));
        return WorkspaceResponse.from(saved);
    }

    @Transactional
    public void remover(String slug) {
        if (DEFAULT_SLUG.equals(slug)) {
            // ApiExceptionHandler maps IllegalArgumentException -> HTTP 400.
            throw new IllegalArgumentException("O workspace inicial não pode ser removido.");
        }
        accessService.requireManage(slug);
        workspaceRepository.findBySlug(slug).ifPresent(workspace -> {
            memberRepository.findByWorkspaceIdOrderByJoinedAtAsc(slug).forEach(memberRepository::delete);
            workspaceRepository.delete(workspace);
        });
    }

    // --- Members --------------------------------------------------------------

    public List<WorkspaceMemberResponse> membros(String slug) {
        return memberRepository.findByWorkspaceIdOrderByJoinedAtAsc(slug)
                .stream()
                .map(WorkspaceMemberResponse::from)
                .toList();
    }

    @Transactional
    public WorkspaceMemberResponse adicionarMembro(String slug, WorkspaceMemberRequest request) {
        accessService.requireManage(slug);
        assertWorkspaceExists(slug);
        String actorId = request.actorId().trim();
        memberRepository.findByWorkspaceIdAndActorId(slug, actorId).ifPresent(existing -> {
            throw new IllegalArgumentException("Esta pessoa já é membro do workspace.");
        });
        WorkspaceMember member = new WorkspaceMember(
                slug,
                actorId,
                firstNonBlank(request.displayName(), actorId),
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
        WorkspaceMember member = memberRepository.findByIdAndWorkspaceId(memberId, slug)
                .orElseThrow(() -> new IllegalArgumentException("Membro não pertence ao workspace informado."));
        if (request.displayName() != null && !request.displayName().isBlank()) {
            member.setDisplayName(request.displayName().trim());
        }
        if (request.role() != null && !request.role().isBlank()) {
            member.setRole(normalizeRole(request.role()));
        }
        if (request.status() != null && !request.status().isBlank()) {
            member.setStatus(normalizeStatus(request.status()));
        }
        return WorkspaceMemberResponse.from(memberRepository.save(member));
    }

    @Transactional
    public void removerMembro(String slug, Long memberId) {
        accessService.requireManage(slug);
        memberRepository.findByIdAndWorkspaceId(memberId, slug).ifPresent(memberRepository::delete);
    }

    // --- Helpers --------------------------------------------------------------

    private void assertWorkspaceExists(String slug) {
        if (workspaceRepository.findBySlug(slug).isEmpty()) {
            throw new IllegalArgumentException("Workspace não encontrado: " + slug);
        }
    }

    /** Guarantees the shipped workspace exists so the list is never empty. */
    private void ensureDefault() {
        if (!workspaceRepository.existsBySlug(DEFAULT_SLUG)) {
            workspaceRepository.save(new Workspace(DEFAULT_SLUG, DEFAULT_NOME, null, clock.now()));
        }
    }

    /** Appends -2, -3, … until the slug is free, so names can repeat safely. */
    private String uniqueSlug(String base) {
        String root = base.isBlank() ? "workspace" : base;
        String candidate = root;
        int suffix = 2;
        while (workspaceRepository.existsBySlug(candidate)) {
            candidate = root + "-" + suffix++;
        }
        return candidate;
    }

    // "Horta Comunitária 2" -> "horta-comunitaria-2": accent-folded, lowercased,
    // every run of non-alphanumerics collapsed to a single hyphen.
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
        return (status == null || status.isBlank() ? "ACTIVE" : status.trim()).toUpperCase(java.util.Locale.ROOT);
    }

    private static String firstNonBlank(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
