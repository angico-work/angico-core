package com.angico.auth;

import com.angico.common.ForbiddenException;
import com.angico.common.UnauthorizedException;
import com.angico.pessoas.AngicoIdNormalizer;
import com.angico.pessoas.Pessoa;
import com.angico.pessoas.PessoaRepository;
import com.angico.workspaces.Workspace;
import com.angico.workspaces.WorkspaceMember;
import com.angico.workspaces.WorkspaceMemberRepository;
import com.angico.workspaces.WorkspaceRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.text.Normalizer;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    public static final String DEFAULT_WORKSPACE_ID = "coletivo-jardim-novo";
    public static final Duration SESSION_LIFETIME = Duration.ofHours(12);

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final Pattern BASIC_EMAIL_PATTERN = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

    private final PessoaRepository pessoaRepository;
    private final PasswordHasher passwordHasher;
    private final AuthSessionRepository sessionRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository memberRepository;
    private final String dummyPasswordHash;
    private final boolean publicRegistration;

    public AuthService(
            PessoaRepository pessoaRepository,
            PasswordHasher passwordHasher,
            AuthSessionRepository sessionRepository,
            WorkspaceRepository workspaceRepository,
            WorkspaceMemberRepository memberRepository,
            @Value("${angico.auth.public-registration:false}") boolean publicRegistration
    ) {
        this.pessoaRepository = pessoaRepository;
        this.passwordHasher = passwordHasher;
        this.sessionRepository = sessionRepository;
        this.workspaceRepository = workspaceRepository;
        this.memberRepository = memberRepository;
        this.dummyPasswordHash = passwordHasher.hash(newToken());
        this.publicRegistration = publicRegistration;
    }

    @Transactional
    public IssuedSession login(LoginRequest request) {
        String email = normalizeEmail(request.email());
        Optional<Pessoa> candidate = pessoaRepository.findByEmailIgnoreCase(email);
        String passwordHash = candidate
                .map(Pessoa::getPasswordHash)
                .filter(hash -> !hash.isBlank())
                .orElse(dummyPasswordHash);
        boolean passwordMatches = passwordHasher.matches(
                request.password() == null ? "" : request.password(), passwordHash);
        Pessoa pessoa = candidate
                .filter(value -> "ATIVA".equalsIgnoreCase(value.getStatus()))
                .filter(value -> passwordMatches)
                .orElseThrow(() -> new UnauthorizedException("Credenciais inválidas."));

        String workspaceId = activeWorkspaceId(pessoa);
        pessoa.setLastLoginAt(Instant.now());
        pessoaRepository.save(pessoa);
        return issueSession(pessoa, workspaceId);
    }

    @Transactional
    public IssuedSession register(RegisterRequest request) {
        if (!publicRegistration) {
            throw new ForbiddenException("Cadastro público desabilitado.");
        }

        String nome = requireText(request.nome(), "Nome");
        String email = normalizeEmail(request.email());
        String angicoId = AngicoIdNormalizer.normalize(request.angicoId());
        String password = request.password() == null ? "" : request.password();
        validateEmail(email);
        validatePassword(password);
        if (pessoaRepository.findByEmailIgnoreCase(email).isPresent()) {
            throw new IllegalArgumentException("Email já cadastrado.");
        }
        if (pessoaRepository.findByAngicoIdIgnoreCase(angicoId).isPresent()) {
            throw new IllegalArgumentException("Angico ID já está em uso.");
        }

        Instant now = Instant.now();
        String workspaceId = uniqueIsolatedWorkspaceSlug(angicoId);
        Workspace workspace = workspaceRepository.save(
                new Workspace(workspaceId, "Espaço de " + nome, "@" + angicoId, now));

        Pessoa pessoa = new Pessoa();
        pessoa.setWorkspaceId(workspace.getSlug());
        pessoa.setNome(nome);
        pessoa.setEmail(email);
        pessoa.setAngicoId(angicoId);
        pessoa.setPapel("OWNER");
        pessoa.setStatus("ATIVA");
        pessoa.setPasswordHash(passwordHasher.hash(password));
        pessoa.setCreatedAt(now);
        pessoa.setLastLoginAt(now);
        try {
            pessoa = pessoaRepository.saveAndFlush(pessoa);
        } catch (DataIntegrityViolationException ex) {
            throw new IllegalArgumentException("Email ou Angico ID já cadastrado.");
        }
        memberRepository.save(new WorkspaceMember(
                workspace.getSlug(), angicoId, nome, "OWNER", "ACTIVE", now));
        return issueSession(pessoa, workspace.getSlug());
    }

    public AngicoIdAvailabilityResponse checkAngicoId(String rawAngicoId) {
        String angicoId = AngicoIdNormalizer.normalize(rawAngicoId);
        boolean available = pessoaRepository.findByAngicoIdIgnoreCase(angicoId).isEmpty();
        return new AngicoIdAvailabilityResponse(
                angicoId,
                available,
                available ? "Angico ID disponível." : "Angico ID já está em uso."
        );
    }

    @Transactional
    public Optional<SessionPrincipal> authenticateSession(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return Optional.empty();
        }
        String csrfToken = csrfTokenFor(rawToken);
        Instant now = Instant.now();
        Optional<AuthSession> persisted = sessionRepository.findByTokenHash(hashToken(rawToken));
        if (persisted.isEmpty() || persisted.get().getRevokedAt() != null) {
            return Optional.empty();
        }
        AuthSession session = persisted.get();
        if (!session.getExpiresAt().isAfter(now)) {
            session.revoke(now);
            sessionRepository.save(session);
            return Optional.empty();
        }
        return Optional.of(session)
                .filter(candidate -> secureEquals(candidate.getCsrfTokenHash(), hashToken(csrfToken)))
                .flatMap(candidate -> pessoaRepository.findById(candidate.getPessoaId())
                        .filter(pessoa -> "ATIVA".equalsIgnoreCase(pessoa.getStatus()))
                        .map(pessoa -> new SessionPrincipal(pessoa, candidate, csrfToken)));
    }

    public AuthResponse currentSession(Long sessionId, String csrfToken) {
        AuthSession session = requireActiveSession(sessionId);
        Pessoa pessoa = pessoaRepository.findById(session.getPessoaId())
                .filter(candidate -> "ATIVA".equalsIgnoreCase(candidate.getStatus()))
                .orElseThrow(() -> new UnauthorizedException("Sessão inválida."));
        if (!secureEquals(session.getCsrfTokenHash(), hashToken(csrfToken))) {
            throw new UnauthorizedException("Sessão inválida.");
        }
        return toResponse(pessoa, session, csrfToken);
    }

    public boolean validCsrf(Long sessionId, String rawCsrfToken) {
        if (rawCsrfToken == null || rawCsrfToken.isBlank()) {
            return false;
        }
        try {
            AuthSession session = requireActiveSession(sessionId);
            return secureEquals(session.getCsrfTokenHash(), hashToken(rawCsrfToken));
        } catch (UnauthorizedException ex) {
            return false;
        }
    }

    @Transactional
    public void logout(Long sessionId) {
        AuthSession session = requireActiveSession(sessionId);
        session.revoke(Instant.now());
        sessionRepository.save(session);
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
        String normalizedAngicoId = AngicoIdNormalizer.normalize(angicoId);
        Instant now = Instant.now();
        Workspace workspace = workspaceRepository.findBySlug(workspaceId).orElseGet(() -> workspaceRepository.save(
                new Workspace(workspaceId, "Espaço de " + nome, "@" + normalizedAngicoId, now)));
        workspace.setStatus("ACTIVE");
        workspace.setUpdatedAt(now);
        Pessoa pessoa = pessoaRepository.findByEmailIgnoreCase(normalizedEmail)
                .map(existing -> {
                    if (!workspaceId.equals(existing.getWorkspaceId())) {
                        throw new IllegalStateException("A conta de demonstração já pertence a outro workspace.");
                    }
                    if (existing.getPasswordHash() == null || existing.getPasswordHash().isBlank()) {
                        existing.setPasswordHash(passwordHasher.hash(rawPassword));
                    }
                    existing.setNome(nome);
                    if (existing.getAngicoId() == null || existing.getAngicoId().isBlank()) {
                        existing.setAngicoId(AngicoIdNormalizer.normalizeOptional(angicoId));
                    }
                    existing.setPapel(papel);
                    existing.setStatus("ATIVA");
                    return pessoaRepository.save(existing);
                })
                .orElseGet(() -> {
                    Pessoa created = new Pessoa();
                    created.setWorkspaceId(workspaceId);
                    created.setNome(nome);
                    created.setEmail(normalizedEmail);
                    created.setAngicoId(normalizedAngicoId);
                    created.setPapel(papel);
                    created.setStatus("ATIVA");
                    created.setPasswordHash(passwordHasher.hash(rawPassword));
                    created.setCreatedAt(now);
                    return pessoaRepository.save(created);
                });
        ensureLocalSeedMembership(pessoa, workspaceId, now);
        return pessoa;
    }

    private IssuedSession issueSession(Pessoa pessoa, String workspaceId) {
        String rawToken = newToken();
        String csrfToken = csrfTokenFor(rawToken);
        Instant now = Instant.now();
        AuthSession session = sessionRepository.save(new AuthSession(
                pessoa.getId(),
                workspaceId,
                hashToken(rawToken),
                hashToken(csrfToken),
                now,
                now.plus(SESSION_LIFETIME)
        ));
        return new IssuedSession(rawToken, toResponse(pessoa, session, csrfToken));
    }

    private String activeWorkspaceId(Pessoa pessoa) {
        String actorId = pessoa.getAngicoId();
        String legacyWorkspaceId = pessoa.getWorkspaceId();
        if (actorId == null || actorId.isBlank()) {
            return null;
        }
        var activeMemberships = memberRepository.findByActorIdAndStatusOrderByJoinedAtAsc(actorId, "ACTIVE");
        return activeMemberships
                .stream()
                .filter(member -> legacyWorkspaceId != null && legacyWorkspaceId.equals(member.getWorkspaceId()))
                .findFirst()
                .or(() -> activeMemberships.stream().findFirst())
                .map(WorkspaceMember::getWorkspaceId)
                .orElse(null);
    }

    private void ensureLocalSeedMembership(Pessoa pessoa, String workspaceId, Instant now) {
        String actorId = pessoa.getAngicoId();
        WorkspaceMember membership = memberRepository.findByWorkspaceIdAndActorId(workspaceId, actorId)
                .orElseGet(() -> new WorkspaceMember(
                        workspaceId,
                        actorId,
                        pessoa.getNome(),
                        membershipRole(pessoa.getPapel()),
                        "ACTIVE",
                        now
                ));
        membership.setDisplayName(pessoa.getNome());
        membership.setRole(membershipRole(pessoa.getPapel()));
        membership.setStatus("ACTIVE");
        memberRepository.save(membership);
    }

    private String membershipRole(String papel) {
        if (papel == null) {
            return "MEMBER";
        }
        return switch (papel.trim().toUpperCase(Locale.ROOT)) {
            case "LIDER", "OWNER" -> "OWNER";
            case "ADMIN" -> "ADMIN";
            case "COORDENACAO", "COORDINATOR" -> "COORDINATOR";
            case "MAPPER" -> "MAPPER";
            case "VIEWER" -> "VIEWER";
            default -> "MEMBER";
        };
    }

    private AuthSession requireActiveSession(Long sessionId) {
        Instant now = Instant.now();
        return sessionRepository.findById(sessionId)
                .filter(session -> session.getRevokedAt() == null)
                .filter(session -> session.getExpiresAt().isAfter(now))
                .orElseThrow(() -> new UnauthorizedException("Sessão inválida ou expirada."));
    }

    private AuthResponse toResponse(Pessoa pessoa, AuthSession session, String csrfToken) {
        return new AuthResponse(
                pessoa.getId(),
                pessoa.getNome(),
                pessoa.getEmail(),
                pessoa.getAngicoId(),
                pessoa.getPapel(),
                session.getWorkspaceId(),
                session.getExpiresAt(),
                csrfToken
        );
    }

    private String uniqueIsolatedWorkspaceSlug(String angicoId) {
        String folded = Normalizer.normalize(angicoId, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-+|-+$)", "");
        String root = "pessoal-" + (folded.isBlank() ? "workspace" : folded);
        String candidate = root;
        int suffix = 2;
        while (workspaceRepository.existsBySlug(candidate)) {
            candidate = root + "-" + suffix++;
        }
        return candidate;
    }

    private String requireText(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(fieldName + " é obrigatório.");
        }
        return value.trim();
    }

    private String normalizeEmail(String rawEmail) {
        return rawEmail == null ? "" : rawEmail.trim().toLowerCase(Locale.ROOT);
    }

    private void validateEmail(String email) {
        if (!BASIC_EMAIL_PATTERN.matcher(email).matches()) {
            throw new IllegalArgumentException("Informe um email válido.");
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

    private String csrfTokenFor(String sessionToken) {
        return hashToken("csrf:" + sessionToken);
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

    private boolean secureEquals(String expected, String actual) {
        if (expected == null || actual == null) {
            return false;
        }
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                actual.getBytes(StandardCharsets.UTF_8)
        );
    }

    public record IssuedSession(String token, AuthResponse response) {
    }

    public record SessionPrincipal(Pessoa pessoa, AuthSession session, String csrfToken) {
    }
}
