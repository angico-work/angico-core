package com.angico.acoes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import java.time.Instant;

/**
 * Uma ação concreta executada como parte de uma missão. É o passo de execução
 * do fluxo territorial: o que foi efetivamente feito, por quem e em que estado.
 */
@Entity
public class Acao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String workspaceId;

    @Column(nullable = false)
    private String titulo;

    @Column(length = 2000)
    private String descricao;

    @Column(nullable = false)
    private String status;

    private String missaoId;

    private String responsavelId;

    @Column(nullable = false)
    private Instant createdAt;

    protected Acao() {
    }

    public Acao(
            String workspaceId,
            String titulo,
            String descricao,
            String status,
            String missaoId,
            String responsavelId,
            Instant createdAt
    ) {
        this.workspaceId = workspaceId;
        this.titulo = titulo;
        this.descricao = descricao;
        this.status = status;
        this.missaoId = missaoId;
        this.responsavelId = responsavelId;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public String getWorkspaceId() {
        return workspaceId;
    }

    public String getTitulo() {
        return titulo;
    }

    public String getDescricao() {
        return descricao;
    }

    public String getStatus() {
        return status;
    }

    public String getMissaoId() {
        return missaoId;
    }

    public String getResponsavelId() {
        return responsavelId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
