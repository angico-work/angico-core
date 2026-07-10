package com.angico.organizacoes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;

@Entity
@Table(uniqueConstraints = @UniqueConstraint(
        name = "uk_participacao_active_identity",
        columnNames = "activeIdentity"
))
public class Participacao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String workspaceId;

    @Column(nullable = false)
    private Long organizationId;

    @Column(nullable = false)
    private Long pessoaId;

    @Column(nullable = false, length = 40)
    private String papel;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(nullable = false)
    private Instant startedAt;

    private Instant endedAt;

    @Column(nullable = false)
    private Instant recordedAt;

    @Column(nullable = false)
    private String actorId;

    @Column(length = 64)
    private String activeIdentity;

    protected Participacao() {
    }

    public Participacao(
            String workspaceId,
            Long organizationId,
            Long pessoaId,
            String papel,
            String status,
            Instant startedAt,
            Instant endedAt,
            Instant recordedAt,
            String actorId,
            String activeIdentity
    ) {
        this.workspaceId = workspaceId;
        this.organizationId = organizationId;
        this.pessoaId = pessoaId;
        this.papel = papel;
        this.status = status;
        this.startedAt = startedAt;
        this.endedAt = endedAt;
        this.recordedAt = recordedAt;
        this.actorId = actorId;
        this.activeIdentity = activeIdentity;
    }

    public Long getId() {
        return id;
    }

    public String getWorkspaceId() {
        return workspaceId;
    }

    public Long getOrganizationId() {
        return organizationId;
    }

    public Long getPessoaId() {
        return pessoaId;
    }

    public String getPapel() {
        return papel;
    }

    public String getStatus() {
        return status;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public Instant getEndedAt() {
        return endedAt;
    }

    public Instant getRecordedAt() {
        return recordedAt;
    }

    public String getActorId() {
        return actorId;
    }
}
