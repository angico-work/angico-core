package com.angico.workspaces;

import com.angico.common.CurrentActorProvider;
import com.angico.pessoas.Pessoa;
import com.angico.pessoas.PessoaRepository;
import java.util.Optional;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class WorkspaceAccessService {

    private static final Set<String> MANAGING_ROLES = Set.of("OWNER", "ADMIN");

    private final WorkspaceMemberRepository memberRepository;
    private final CurrentActorProvider currentActorProvider;
    private final PessoaRepository pessoaRepository;
    private final WorkspaceAuthorizationService authorizationService;

    public WorkspaceAccessService(
            WorkspaceMemberRepository memberRepository,
            CurrentActorProvider currentActorProvider,
            PessoaRepository pessoaRepository,
            WorkspaceAuthorizationService authorizationService
    ) {
        this.memberRepository = memberRepository;
        this.currentActorProvider = currentActorProvider;
        this.pessoaRepository = pessoaRepository;
        this.authorizationService = authorizationService;
    }

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

    public void requireManage(String workspaceId) {
        authorizationService.requireRole(workspaceId, MANAGING_ROLES);
    }
}
