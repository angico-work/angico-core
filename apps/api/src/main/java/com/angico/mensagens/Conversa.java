package com.angico.mensagens;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(indexes = @Index(
        name = "idx_conversa_workspace_context",
        columnList = "workspaceId,contextEntityType,contextEntityId"
))
public class Conversa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String workspaceId;
    private Long territorioId;
    private String contextEntityType;
    private String contextEntityId;
    @Column(length = 240)
    private String titulo;
    private Long createdByPessoaId;
    private String status;
    private Instant createdAt;
    private Instant updatedAt;

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

    public Long getTerritorioId() {
        return territorioId;
    }

    public void setTerritorioId(Long territorioId) {
        this.territorioId = territorioId;
    }

    public String getContextEntityType() {
        return contextEntityType;
    }

    public void setContextEntityType(String contextEntityType) {
        this.contextEntityType = contextEntityType;
    }

    public String getContextEntityId() {
        return contextEntityId;
    }

    public void setContextEntityId(String contextEntityId) {
        this.contextEntityId = contextEntityId;
    }

    public String getTitulo() {
        return titulo;
    }

    public void setTitulo(String titulo) {
        this.titulo = titulo;
    }

    public Long getCreatedByPessoaId() {
        return createdByPessoaId;
    }

    public void setCreatedByPessoaId(Long createdByPessoaId) {
        this.createdByPessoaId = createdByPessoaId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
