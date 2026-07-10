package com.angico.recursos;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
public class UsoRecurso {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String workspaceId;

    @Column(nullable = false)
    private Long recursoId;

    @Column(nullable = false)
    private Long acaoId;

    @Column(nullable = false, precision = 16, scale = 4)
    private BigDecimal quantidade;

    @Column(nullable = false, length = 40)
    private String unidade;

    @Column(nullable = false)
    private Instant occurredAt;

    @Column(nullable = false)
    private Instant recordedAt;

    @Column(nullable = false)
    private String actorId;

    protected UsoRecurso() {
    }

    public UsoRecurso(
            String workspaceId,
            Long recursoId,
            Long acaoId,
            BigDecimal quantidade,
            String unidade,
            Instant occurredAt,
            Instant recordedAt,
            String actorId
    ) {
        this.workspaceId = workspaceId;
        this.recursoId = recursoId;
        this.acaoId = acaoId;
        this.quantidade = quantidade;
        this.unidade = unidade;
        this.occurredAt = occurredAt;
        this.recordedAt = recordedAt;
        this.actorId = actorId;
    }

    public Long getId() {
        return id;
    }

    public String getWorkspaceId() {
        return workspaceId;
    }

    public Long getRecursoId() {
        return recursoId;
    }

    public Long getAcaoId() {
        return acaoId;
    }

    public BigDecimal getQuantidade() {
        return quantidade;
    }

    public String getUnidade() {
        return unidade;
    }

    public Instant getOccurredAt() {
        return occurredAt;
    }

    public Instant getRecordedAt() {
        return recordedAt;
    }

    public String getActorId() {
        return actorId;
    }
}
