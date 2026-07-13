package com.angico.recursos;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import java.time.Instant;

@Entity
public class Recurso {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String workspaceId;

    @Column(nullable = false, length = 200)
    private String nome;

    @Column(nullable = false, length = 40)
    private String categoria;

    @Column(nullable = false, length = 40)
    private String unidade;

    @Column(length = 2000)
    private String descricao;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(nullable = false)
    private String actorId;

    @Column(nullable = false)
    private Instant createdAt;

    protected Recurso() {
    }

    public Recurso(
            String workspaceId,
            String nome,
            String categoria,
            String unidade,
            String descricao,
            String status,
            String actorId,
            Instant createdAt
    ) {
        this.workspaceId = workspaceId;
        this.nome = nome;
        this.categoria = categoria;
        this.unidade = unidade;
        this.descricao = descricao;
        this.status = status;
        this.actorId = actorId;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public String getWorkspaceId() {
        return workspaceId;
    }

    public String getNome() {
        return nome;
    }

    public String getCategoria() {
        return categoria;
    }

    public String getUnidade() {
        return unidade;
    }

    public String getDescricao() {
        return descricao;
    }

    public String getStatus() {
        return status;
    }

    public String getActorId() {
        return actorId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
