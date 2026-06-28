package com.angico.auth;

import com.angico.common.CurrentActorProvider;
import com.angico.common.UnauthorizedException;
import com.angico.pessoas.PessoaRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final CurrentActorProvider currentActorProvider;
    private final PessoaRepository pessoaRepository;

    public AuthController(
            AuthService authService,
            CurrentActorProvider currentActorProvider,
            PessoaRepository pessoaRepository
    ) {
        this.authService = authService;
        this.currentActorProvider = currentActorProvider;
        this.pessoaRepository = pessoaRepository;
    }

    @PostMapping("/login")
    public AuthResponse login(@RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/register")
    public AuthResponse register(@RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @GetMapping("/angico-id/available")
    public AngicoIdAvailabilityResponse checkAngicoId(@RequestParam String angicoId) {
        return authService.checkAngicoId(angicoId);
    }

    @GetMapping("/me")
    public AuthResponse me() {
        Long pessoaId = currentActorProvider.currentPessoaId()
                .orElseThrow(() -> new UnauthorizedException("Sessão inválida."));
        var pessoa = pessoaRepository.findById(pessoaId)
                .orElseThrow(() -> new UnauthorizedException("Sessão inválida."));
        return new AuthResponse(
                null,
                pessoa.getId(),
                pessoa.getWorkspaceId(),
                pessoa.getNome(),
                pessoa.getEmail(),
                pessoa.getAngicoId(),
                pessoa.getPapel()
        );
    }

    @PostMapping("/logout")
    public void logout() {
        Long pessoaId = currentActorProvider.currentPessoaId()
                .orElseThrow(() -> new UnauthorizedException("Sessão inválida."));
        authService.logout(pessoaId);
    }
}
