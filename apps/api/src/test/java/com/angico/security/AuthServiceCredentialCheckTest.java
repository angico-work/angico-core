package com.angico.security;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.angico.auth.AuthService;
import com.angico.auth.AuthSessionRepository;
import com.angico.auth.LoginRequest;
import com.angico.auth.PasswordHasher;
import com.angico.common.UnauthorizedException;
import com.angico.pessoas.PessoaRepository;
import com.angico.workspaces.WorkspaceMemberRepository;
import com.angico.workspaces.WorkspaceRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AuthServiceCredentialCheckTest {

    @Mock private PessoaRepository pessoaRepository;
    @Mock private PasswordHasher passwordHasher;
    @Mock private AuthSessionRepository sessionRepository;
    @Mock private WorkspaceRepository workspaceRepository;
    @Mock private WorkspaceMemberRepository memberRepository;

    @Test
    void checksAFullPasswordHashWhenTheEmailDoesNotExist() {
        when(passwordHasher.hash(anyString())).thenReturn("dummy-password-hash");
        when(pessoaRepository.findByEmailIgnoreCase("missing@example.test")).thenReturn(Optional.empty());
        AuthService service = new AuthService(
                pessoaRepository,
                passwordHasher,
                sessionRepository,
                workspaceRepository,
                memberRepository,
                false
        );

        assertThrows(UnauthorizedException.class,
                () -> service.login(new LoginRequest("missing@example.test", "wrong-password")));

        verify(passwordHasher).matches("wrong-password", "dummy-password-hash");
    }
}
