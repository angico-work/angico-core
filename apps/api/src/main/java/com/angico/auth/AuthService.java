package com.angico.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Pattern;

import com.angico.common.UnauthorizedException;
import com.angico.pessoas.AngicoIdNormalizer;
import com.angico.pessoas.Pessoa;
import com.angico.pessoas.PessoaRepository;
<<<<<<< HEAD
=======
import com.angico.territorios.TerritorioService;
>>>>>>> origin
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

<<<<<<< HEAD
    // Default workspace for self-service registration. Kept in sync with the
    // web client's DEFAULT_WORKSPACE (apps/web/src/lib/api.ts) so a freshly
    // registered leader lands in the same territory the UI queries by default.
    public static final String DEFAULT_WORKSPACE_ID = "coletivo-jardim-novo";

=======
>>>>>>> origin
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final Pattern BASIC_EMAIL_PATTERN = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

    private final PessoaRepository pessoaRepository;
    private final PasswordHasher passwordHasher;

    public AuthService(PessoaRepository pessoaRepository, PasswordHasher passwordHasher) {
        this.pessoaRepository = pessoaRepository;
        this.passwordHasher = passwordHasher;
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.email());
        Pessoa pessoa = pessoaRepository.findByEmailIgnoreCase(email)
                .filter(candidate -> "ATIVA".equalsIgnoreCase(candidate.getStatus()))
                .filter(candidate -> passwordHasher.matches(request.password(), candidate.getPasswordHash()))
<<<<<<< HEAD
                .orElseThrow(() -> new UnauthorizedException("Credenciais inválidas."));
=======
                .orElseThrow(() -> new UnauthorizedException("Credenciais invalidas."));
>>>>>>> origin

        String token = newToken();
        Instant now = Instant.now();
        pessoa.setAuthTokenHash(hashToken(token));
        pessoa.setAuthTokenIssuedAt(now);
        pessoa.setLastLoginAt(now);
        pessoa = pessoaRepository.save(pessoa);
        return toResponse(token, pessoa);
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String nome = requireText(request.nome(), "Nome");
        String email = normalizeEmail(request.email());
        String angicoId = AngicoIdNormalizer.normalize(request.angicoId());
        String password = request.password() == null ? "" : request.password();
        validateEmail(email);
        validatePassword(password);
        if (pessoaRepository.findByEmailIgnoreCase(email).isPresent()) {
<<<<<<< HEAD
            throw new IllegalArgumentException("Email já cadastrado.");
        }
        if (pessoaRepository.findByAngicoIdIgnoreCase(angicoId).isPresent()) {
            throw new IllegalArgumentException("Angico ID já está em uso.");
        }

        Pessoa pessoa = new Pessoa();
        pessoa.setWorkspaceId(DEFAULT_WORKSPACE_ID);
=======
            throw new IllegalArgumentException("Email ja cadastrado.");
        }
        if (pessoaRepository.findByAngicoIdIgnoreCase(angicoId).isPresent()) {
            throw new IllegalArgumentException("Angico ID ja esta em uso.");
        }

        Pessoa pessoa = new Pessoa();
        pessoa.setWorkspaceId(TerritorioService.DEFAULT_WORKSPACE_ID);
>>>>>>> origin
        pessoa.setNome(nome);
        pessoa.setEmail(email);
        pessoa.setAngicoId(angicoId);
        pessoa.setPapel("LIDER");
        pessoa.setStatus("ATIVA");
        pessoa.setPasswordHash(passwordHasher.hash(password));
        Instant now = Instant.now();
        pessoa.setCreatedAt(now);
        String token = newToken();
        pessoa.setAuthTokenHash(hashToken(token));
        pessoa.setAuthTokenIssuedAt(now);
        pessoa.setLastLoginAt(now);
        try {
            pessoa = pessoaRepository.saveAndFlush(pessoa);
        } catch (DataIntegrityViolationException ex) {
<<<<<<< HEAD
            throw new IllegalArgumentException("Email ou Angico ID já cadastrado.");
=======
            throw new IllegalArgumentException("Email ou Angico ID ja cadastrado.");
>>>>>>> origin
        }
        return toResponse(token, pessoa);
    }

    public AngicoIdAvailabilityResponse checkAngicoId(String rawAngicoId) {
        String angicoId = AngicoIdNormalizer.normalize(rawAngicoId);
        boolean available = pessoaRepository.findByAngicoIdIgnoreCase(angicoId).isEmpty();
        return new AngicoIdAvailabilityResponse(
                angicoId,
                available,
<<<<<<< HEAD
                available ? "Angico ID disponível." : "Angico ID já está em uso."
=======
                available ? "Angico ID disponivel." : "Angico ID ja esta em uso."
>>>>>>> origin
        );
    }

    public Optional<Pessoa> authenticateToken(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return Optional.empty();
        }
        return pessoaRepository.findByAuthTokenHash(hashToken(rawToken))
                .filter(pessoa -> "ATIVA".equalsIgnoreCase(pessoa.getStatus()));
    }

    @Transactional
    public void logout(Long pessoaId) {
        Pessoa pessoa = pessoaRepository.findById(pessoaId)
<<<<<<< HEAD
                .orElseThrow(() -> new UnauthorizedException("Sessão inválida."));
=======
                .orElseThrow(() -> new UnauthorizedException("Sessao invalida."));
>>>>>>> origin
        pessoa.setAuthTokenHash(null);
        pessoa.setAuthTokenIssuedAt(null);
        pessoaRepository.save(pessoa);
    }

    @Transactional
    public Pessoa ensureLeader(
            String workspaceId,
            String nome,
            String email,
            String angicoId,
            String papel,
            String rawPassword
    ) {
        String normalizedEmail = normalizeEmail(email);
        return pessoaRepository.findByEmailIgnoreCase(normalizedEmail)
                .map(existing -> {
                    if (existing.getPasswordHash() == null || existing.getPasswordHash().isBlank()) {
                        existing.setPasswordHash(passwordHasher.hash(rawPassword));
                    }
                    existing.setWorkspaceId(workspaceId);
                    existing.setNome(nome);
                    if (existing.getAngicoId() == null || existing.getAngicoId().isBlank()) {
                        existing.setAngicoId(AngicoIdNormalizer.normalizeOptional(angicoId));
                    }
                    existing.setPapel(papel);
                    existing.setStatus("ATIVA");
                    return pessoaRepository.save(existing);
                })
                .orElseGet(() -> {
                    Pessoa pessoa = new Pessoa();
                    pessoa.setWorkspaceId(workspaceId);
                    pessoa.setNome(nome);
                    pessoa.setEmail(normalizedEmail);
                    pessoa.setAngicoId(AngicoIdNormalizer.normalize(angicoId));
                    pessoa.setPapel(papel);
                    pessoa.setStatus("ATIVA");
                    pessoa.setPasswordHash(passwordHasher.hash(rawPassword));
                    pessoa.setCreatedAt(Instant.now());
                    return pessoaRepository.save(pessoa);
                });
    }

    private AuthResponse toResponse(String token, Pessoa pessoa) {
        return new AuthResponse(
                token,
                pessoa.getId(),
                pessoa.getWorkspaceId(),
                pessoa.getNome(),
                pessoa.getEmail(),
                pessoa.getAngicoId(),
                pessoa.getPapel()
        );
    }

    private String requireText(String value, String fieldName) {
        if (value == null || value.isBlank()) {
<<<<<<< HEAD
            throw new IllegalArgumentException(fieldName + " é obrigatório.");
=======
            throw new IllegalArgumentException(fieldName + " e obrigatorio.");
>>>>>>> origin
        }
        return value.trim();
    }

    private String normalizeEmail(String rawEmail) {
        return rawEmail == null ? "" : rawEmail.trim().toLowerCase(Locale.ROOT);
    }

    private void validateEmail(String email) {
        if (!BASIC_EMAIL_PATTERN.matcher(email).matches()) {
<<<<<<< HEAD
            throw new IllegalArgumentException("Informe um email válido.");
=======
            throw new IllegalArgumentException("Informe um email valido.");
>>>>>>> origin
        }
    }

    private void validatePassword(String password) {
        if (password.length() < 8) {
            throw new IllegalArgumentException("A senha precisa ter pelo menos 8 caracteres.");
        }
    }

    private String newToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
        } catch (Exception ex) {
            throw new IllegalStateException("Falha ao validar token.", ex);
        }
    }
}
