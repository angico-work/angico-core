package com.angico.pessoas;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Column;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;

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

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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
