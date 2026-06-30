package com.angico.workspaces;

import com.angico.common.CurrentActorProvider;
import com.angico.common.ForbiddenException;
import com.angico.pessoas.Pessoa;
import com.angico.pessoas.PessoaRepository;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.springframework.stereotype.Service;

/**
 * Resolves the current actor and enforces role-based access on workspace
 * management. Kept deliberately permissive under the soft-auth default: an
 * unauthenticated request, or a workspace with no members yet, is never blocked —
 * so the public/demo flows keep working. Once a workspace has members, only
 * OWNER/ADMIN may manage it.
 */
@Service
public class WorkspaceAccessService {

    private static final Set<String> MANAGING_ROLES = Set.of("OWNER", "ADMIN");

    private final WorkspaceMemberRepository memberRepository;
    private final CurrentActorProvider currentActorProvider;
    private final PessoaRepository pessoaRepository;

    public WorkspaceAccessService(
            WorkspaceMemberRepository memberRepository,
            CurrentActorProvider currentActorProvider,
            PessoaRepository pessoaRepository
    ) {
        this.memberRepository = memberRepository;
        this.currentActorProvider = currentActorProvider;
        this.pessoaRepository = pessoaRepository;
    }

    /** The current request's actor as an Angico ID, or empty under soft-auth/public. */
    public Optional<String> currentActorId() {
        return currentActorProvider.currentPessoaId()
                .flatMap(pessoaRepository::findById)
                .map(Pessoa::getAngicoId)
                .filter(id -> id != null && !id.isBlank());
    }

    public Optional<String> currentActorName() {
        return currentActorProvider.currentActorName().filter(name -> !name.isBlank());
    }

    public Optional<String> roleOf(String workspaceId, String actorId) {
        if (actorId == null) {
            return Optional.empty();
        }
        return memberRepository.findByWorkspaceIdAndActorId(workspaceId, actorId)
                .map(WorkspaceMember::getRole);
    }

    /**
     * Guards management actions (editing a workspace, managing members). Allows
     * the action when there is no authenticated actor (soft-auth) or the
     * workspace is still unclaimed (no members); otherwise requires OWNER/ADMIN.
     */
    public void requireManage(String workspaceId) {
        Optional<String> actor = currentActorId();
        if (actor.isEmpty()) {
            return;
        }
        List<WorkspaceMember> members = memberRepository.findByWorkspaceIdOrderByJoinedAtAsc(workspaceId);
        if (members.isEmpty()) {
            return;
        }
        boolean manages = members.stream()
                .anyMatch(m -> actor.get().equals(m.getActorId()) && MANAGING_ROLES.contains(m.getRole()));
        if (!manages) {
            throw new ForbiddenException("Apenas OWNER ou ADMIN podem gerenciar este workspace.");
        }
    }
}
