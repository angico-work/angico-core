package com.angico.missoes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import java.time.Instant;

/**
 * Uma missão: uma frente de ação que o território assume para responder a um
 * problema priorizado. Carrega progresso e pode ser liderada por alguém.
 */
@Entity
public class Missao {

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

    private int progresso;

    private String territorioId;

    private String problemaId;

    private String responsavelId;

    @Column(nullable = false)
    private Instant createdAt;

    protected Missao() {
    }

    public Missao(
            String workspaceId,
            String titulo,
            String descricao,
            String status,
            int progresso,
            String territorioId,
            String problemaId,
            String responsavelId,
            Instant createdAt
    ) {
        this.workspaceId = workspaceId;
        this.titulo = titulo;
        this.descricao = descricao;
        this.status = status;
        this.progresso = progresso;
        this.territorioId = territorioId;
        this.problemaId = problemaId;
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

    public int getProgresso() {
        return progresso;
    }

    public String getTerritorioId() {
        return territorioId;
    }

    public String getProblemaId() {
        return problemaId;
    }

    public String getResponsavelId() {
        return responsavelId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
