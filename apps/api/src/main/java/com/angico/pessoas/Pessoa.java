package com.angico.pessoas;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import java.time.Instant;

@Entity
public class Pessoa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String workspaceId;

    @Column(nullable = false)
    private String nome;

    private String papel;

    @Column(nullable = false)
    private Instant createdAt;

    private String email;

    private String angicoId;

    private String telefone;

    @Lob
    private String foto;

    private String status;

    private String passwordHash;

    private String authTokenHash;

    private Instant authTokenIssuedAt;

    private Instant lastLoginAt;

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

    public String getTelefone() {
        return telefone;
    }

    public void setTelefone(String telefone) {
        this.telefone = telefone;
    }

    public String getFoto() {
        return foto;
    }

    public void setFoto(String foto) {
        this.foto = foto;
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
}
