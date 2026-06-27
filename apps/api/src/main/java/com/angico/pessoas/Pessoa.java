package com.angico.pessoas;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import java.time.Instant;

/**
 * Uma pessoa do território: jovem mapeador, mentor ou participante que se
 * engaja no fluxo de observação e ação local.
 */
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

    protected Pessoa() {
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

    public String getNome() {
        return nome;
    }

    public String getPapel() {
        return papel;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
