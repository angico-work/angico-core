package com.angico.workspaces;

import com.angico.common.CurrentActorProvider;
import com.angico.common.ForbiddenException;
import com.angico.common.UnauthorizedException;
import com.angico.pessoas.Pessoa;
import com.angico.pessoas.PessoaRepository;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public final class WorkspaceAuthorizationService {

    private static final Set<String> WRITE_ROLES = Set.of(
            "OWNER", "ADMIN", "COORDINATOR", "MAPPER", "MEMBER");

    private final WorkspaceMemberRepository memberRepository;
    private final PessoaRepository pessoaRepository;
    private final CurrentActorProvider currentActorProvider;

    public WorkspaceAuthorizationService(
            WorkspaceMemberRepository memberRepository,
            PessoaRepository pessoaRepository,
            CurrentActorProvider currentActorProvider
    ) {
        this.memberRepository = memberRepository;
        this.pessoaRepository = pessoaRepository;
        this.currentActorProvider = currentActorProvider;
    }

    public void requireMember(String workspaceId) {
        activeMembership(workspaceId);
    }

    public void requireRole(String workspaceId, Set<String> roles) {
        WorkspaceMember membership = activeMembership(workspaceId);
        Set<String> normalizedRoles = roles.stream()
                .map(role -> role.toUpperCase(Locale.ROOT))
                .collect(java.util.stream.Collectors.toUnmodifiableSet());
        if (!normalizedRoles.contains(membership.getRole().toUpperCase(Locale.ROOT))) {
            throw new ForbiddenException("Papel insuficiente para este workspace.");
        }
    }

    public String requireAuthorizedWorkspace(String requestedWorkspaceId) {
        String workspaceId = requestedWorkspace(requestedWorkspaceId);
        requireMember(workspaceId);
        return workspaceId;
    }

    public String requireWritableWorkspace(String requestedWorkspaceId) {
        if (requestedWorkspaceId == null || requestedWorkspaceId.isBlank()) {
            throw new ForbiddenException("Workspace obrigatório para operações de escrita.");
        }
        String workspaceId = requestedWorkspaceId.trim();
        requireRole(workspaceId, WRITE_ROLES);
        return workspaceId;
    }

    public boolean hasRole(String workspaceId, Set<String> roles) {
        WorkspaceMember membership = activeMembership(workspaceId);
        return roles.stream().anyMatch(role -> role.equalsIgnoreCase(membership.getRole()));
    }

    public String currentRole(String workspaceId) {
        return activeMembership(workspaceId).getRole();
    }

    public List<String> authorizedWorkspaceIds() {
        String actorId = currentActorId();
        return memberRepository.findByActorIdAndStatusOrderByJoinedAtAsc(actorId, "ACTIVE")
                .stream()
                .map(WorkspaceMember::getWorkspaceId)
                .distinct()
                .toList();
    }

    public String currentActorId() {
        String actorId = currentPessoa().getAngicoId();
        return actorId == null || actorId.isBlank() ? missingAngicoId() : actorId;
    }

    public Pessoa currentPessoa() {
        Long pessoaId = currentActorProvider.currentPessoaId()
                .orElseThrow(() -> new UnauthorizedException("Sessão inválida."));
        return pessoaRepository.findById(pessoaId)
                .orElseThrow(() -> new UnauthorizedException("Sessão inválida."));
    }

    private WorkspaceMember activeMembership(String workspaceId) {
        if (workspaceId == null || workspaceId.isBlank()) {
            throw new ForbiddenException("Workspace obrigatório.");
        }
        return memberRepository.findByWorkspaceIdAndActorId(workspaceId.trim(), currentActorId())
                .filter(member -> "ACTIVE".equalsIgnoreCase(member.getStatus()))
                .orElseThrow(() -> new ForbiddenException("Acesso negado ao workspace informado."));
    }

    private String requestedWorkspace(String requestedWorkspaceId) {
        return requestedWorkspaceId == null || requestedWorkspaceId.isBlank()
                ? currentActorProvider.currentWorkspaceId()
                        .orElseThrow(() -> new ForbiddenException("Nenhum workspace ativo na sessão."))
                : requestedWorkspaceId.trim();
    }

    private String missingAngicoId() {
        throw new ForbiddenException("Conta autenticada sem Angico ID ativo.");
    }
}
