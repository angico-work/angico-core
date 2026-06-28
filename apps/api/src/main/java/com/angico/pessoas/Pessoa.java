package com.angico.pessoas;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
<<<<<<< HEAD
=======
import jakarta.persistence.Column;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
>>>>>>> origin
import java.time.Instant;

/**
 * Uma pessoa do território: jovem mapeador, mentor ou participante que se
 * engaja no fluxo de observação e ação local.
 */
@Entity
@Table(
        indexes = {
                @Index(name = "idx_pessoa_workspace_nome", columnList = "workspace_id,nome"),
                @Index(name = "idx_pessoa_workspace_angico", columnList = "workspace_id,angico_id")
        },
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_pessoa_email", columnNames = "email"),
                @UniqueConstraint(name = "uk_pessoa_angico_id", columnNames = "angico_id")
        }
)
public class Pessoa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "workspace_id", nullable = false, length = 80)
    private String workspaceId;
    @Column(nullable = false, length = 140)
    private String nome;
    @Column(nullable = false, length = 60)
    private String papel;
    @Column(nullable = false, length = 190)
    private String email;
    @Column(name = "angico_id", nullable = false, length = 30)
    private String angicoId;
    @Column(nullable = false, length = 40)
    private String status;
    @Column(name = "password_hash", length = 255)
    private String passwordHash;
    @Column(name = "auth_token_hash", length = 120)
    private String authTokenHash;
    private Instant authTokenIssuedAt;
    private Instant lastLoginAt;
    private Instant createdAt;

    @Column(nullable = false)
    private String workspaceId;

    @Column(nullable = false)
    private String nome;

    private String papel;

    @Column(nullable = false)
    private Instant createdAt;

    // --- Auth / identity, grafted from the dev "v.1 funcional" auth slice ---
    // All nullable so the existing 4-arg creation path (PessoaService) keeps
    // working; uniqueness is enforced in AuthService, not via DB constraints,
    // to avoid ddl-auto=update friction on an existing data directory.
    private String email;

    private String angicoId;

    private String status;

    private String passwordHash;

    private String authTokenHash;

    private Instant authTokenIssuedAt;

    private Instant lastLoginAt;

    // Public no-arg constructor: required by JPA and used by the auth flow,
    // which builds a Pessoa via setters during register / ensureLeader.
    public Pessoa() {
    }

    public Pessoa(
            String workspaceId,
            String nome,
            String papel,
            Instant createdAt
    ) {
        this.workspaceId = workspaceId;
        this.nome = nome;
        this.papel = papel;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public String getWorkspaceId() {
        return workspaceId;
    }

    public void setWorkspaceId(String workspaceId) {
        this.workspaceId = workspaceId;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getPapel() {
        return papel;
    }

    public void setPapel(String papel) {
        this.papel = papel;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getAngicoId() {
        return angicoId;
    }

    public void setAngicoId(String angicoId) {
        this.angicoId = angicoId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getAuthTokenHash() {
        return authTokenHash;
    }

    public void setAuthTokenHash(String authTokenHash) {
        this.authTokenHash = authTokenHash;
    }

    public Instant getAuthTokenIssuedAt() {
        return authTokenIssuedAt;
    }

    public void setAuthTokenIssuedAt(Instant authTokenIssuedAt) {
        this.authTokenIssuedAt = authTokenIssuedAt;
    }

    public Instant getLastLoginAt() {
        return lastLoginAt;
    }

    public void setLastLoginAt(Instant lastLoginAt) {
        this.lastLoginAt = lastLoginAt;
    }

    public String getWorkspaceId() {
        return workspaceId;
    }

    public void setWorkspaceId(String workspaceId) {
        this.workspaceId = workspaceId;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getPapel() {
        return papel;
    }

    public void setPapel(String papel) {
        this.papel = papel;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getAngicoId() {
        return angicoId;
    }

    public void setAngicoId(String angicoId) {
        this.angicoId = angicoId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getAuthTokenHash() {
        return authTokenHash;
    }

    public void setAuthTokenHash(String authTokenHash) {
        this.authTokenHash = authTokenHash;
    }

    public Instant getAuthTokenIssuedAt() {
        return authTokenIssuedAt;
    }

    public void setAuthTokenIssuedAt(Instant authTokenIssuedAt) {
        this.authTokenIssuedAt = authTokenIssuedAt;
    }

    public Instant getLastLoginAt() {
        return lastLoginAt;
    }

    public void setLastLoginAt(Instant lastLoginAt) {
        this.lastLoginAt = lastLoginAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
