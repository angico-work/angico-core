package com.angico.pessoas;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.angico.common.ClockProvider;
import com.angico.common.CurrentActorProvider;
import com.angico.workspaces.WorkspaceAuthorizationService;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class PessoaServiceTest {

    private final PessoaRepository repository = mock(PessoaRepository.class);
    private final PessoaMemoryPublisher publisher = mock(PessoaMemoryPublisher.class);
    private final ClockProvider clock = mock(ClockProvider.class);
    private final CurrentActorProvider currentActor = mock(CurrentActorProvider.class);
    private final WorkspaceAuthorizationService authorization = mock(WorkspaceAuthorizationService.class);
    private final PessoaService service = new PessoaService(
            repository,
            publisher,
            clock,
            currentActor,
            authorization);

    @Test
    void directRegistrationRejectsAnInvalidAngicoId() {
        when(authorization.requireWritableWorkspace("workspace-a")).thenReturn("workspace-a");
        when(repository.saveAndFlush(any(Pessoa.class))).thenAnswer(invocation -> invocation.getArgument(0));

        assertThrows(IllegalArgumentException.class, () -> service.registrar(
                new PessoaRequest("workspace-a", "Ana", null, "id invalido")));

        verify(repository, never()).saveAndFlush(any(Pessoa.class));
    }

    @Test
    void currentProfileUpdateUsesActiveAuthorizedWorkspacesInsteadOfTheLegacyWorkspace() {
        Pessoa pessoa = pessoa();
        when(currentActor.currentPessoaId()).thenReturn(Optional.of(42L));
        when(repository.findById(42L)).thenReturn(Optional.of(pessoa));
        when(repository.save(any(Pessoa.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(authorization.authorizedWorkspaceIds()).thenReturn(List.of("workspace-a", "workspace-b"));
        when(authorization.currentActorId()).thenReturn("ana.sp");

        PessoaResponse response = service.updateCurrent(new PessoaUpdateRequest("Ana Silva", null, null));

        assertEquals("Ana Silva", response.nome());
        verify(authorization, never()).requireMember(anyString());
        verify(publisher).publicarAtualizada(pessoa, "workspace-a", "ana.sp");
        verify(publisher).publicarAtualizada(pessoa, "workspace-b", "ana.sp");
        verify(publisher, never()).publicarAtualizada(pessoa, "workspace-legado", "ana.sp");
    }

    @Test
    void currentProfileUpdateWithoutMembershipDoesNotInventAWorkspaceEvent() {
        Pessoa pessoa = pessoa();
        when(currentActor.currentPessoaId()).thenReturn(Optional.of(42L));
        when(repository.findById(42L)).thenReturn(Optional.of(pessoa));
        when(repository.save(any(Pessoa.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(authorization.authorizedWorkspaceIds()).thenReturn(List.of());
        when(authorization.currentActorId()).thenReturn("ana.sp");

        PessoaResponse response = service.updateCurrent(new PessoaUpdateRequest("Ana Silva", null, null));

        assertEquals("Ana Silva", response.nome());
        verify(publisher, never()).publicarAtualizada(any(Pessoa.class), anyString(), anyString());
    }

    private Pessoa pessoa() {
        Pessoa pessoa = new Pessoa(
                "workspace-legado",
                "Ana",
                "Mobilizadora",
                Instant.parse("2026-07-10T18:00:00Z"));
        ReflectionTestUtils.setField(pessoa, "id", 42L);
        pessoa.setAngicoId("ana.sp");
        pessoa.setStatus("ATIVA");
        return pessoa;
    }
}
