package com.angico.workspaces;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

import com.angico.common.CurrentActorProvider;
import com.angico.common.ForbiddenException;
import com.angico.pessoas.PessoaRepository;
import org.junit.jupiter.api.Test;

class WorkspaceAuthorizationServiceTest {

    @Test
    void writeAuthorizationNeverFallsBackToTheSessionWorkspace() {
        WorkspaceMemberRepository members = mock(WorkspaceMemberRepository.class);
        PessoaRepository people = mock(PessoaRepository.class);
        CurrentActorProvider actor = mock(CurrentActorProvider.class);
        WorkspaceAuthorizationService authorization = new WorkspaceAuthorizationService(
                members, people, actor);

        assertThrows(ForbiddenException.class, () -> authorization.requireWritableWorkspace(null));
        assertThrows(ForbiddenException.class, () -> authorization.requireWritableWorkspace("  "));
        verifyNoInteractions(members, people, actor);
    }
}
