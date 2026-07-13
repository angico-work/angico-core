package com.angico.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;

@Entity
@Table(
        name = "auth_session",
        uniqueConstraints = @UniqueConstraint(name = "uk_auth_session_token_hash", columnNames = "tokenHash"),
        indexes = {
                @Index(name = "idx_auth_session_pessoa", columnList = "pessoaId"),
                @Index(name = "idx_auth_session_expires", columnList = "expiresAt")
        }
)
public class AuthSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long pessoaId;

    private String workspaceId;

    @Column(nullable = false, length = 64)
    private String tokenHash;

    @Column(nullable = false, length = 64)
    private String csrfTokenHash;

    @Column(nullable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant expiresAt;

    private Instant revokedAt;

    protected AuthSession() {
    }

    public AuthSession(
            Long pessoaId,
            String workspaceId,
            String tokenHash,
            String csrfTokenHash,
            Instant createdAt,
            Instant expiresAt
    ) {
        this.pessoaId = pessoaId;
        this.workspaceId = workspaceId;
        this.tokenHash = tokenHash;
        this.csrfTokenHash = csrfTokenHash;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
    }

    public Long getId() {
        return id;
    }

    public Long getPessoaId() {
        return pessoaId;
    }

    public String getWorkspaceId() {
        return workspaceId;
    }

    public String getTokenHash() {
        return tokenHash;
    }

    public String getCsrfTokenHash() {
        return csrfTokenHash;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public Instant getRevokedAt() {
        return revokedAt;
    }

    public void revoke(Instant now) {
        revokedAt = now;
    }
}
