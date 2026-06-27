package com.angico.core.memory;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.Instant;

/**
 * A directed relação between two objetos (origin -[relationType]-> destination),
 * e.g. observacao -[ocorre_em]-> territorio. Relations are time-bounded: an
 * active relation has {@code endedAt == null}; ending it preserves history.
 */
@Entity
@Table(
        name = "memory_relation",
        indexes = @Index(name = "idx_relation_origin", columnList = "workspaceId,originType,originId,relationType,active")
)
public class StoredMemoryRelation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String workspaceId;

    @Column(nullable = false)
    private String originType;

    @Column(nullable = false)
    private String originId;

    @Column(nullable = false)
    private String destinationType;

    @Column(nullable = false)
    private String destinationId;

    @Column(nullable = false)
    private String relationType;

    private String source;
    private String notes;

    @Column(nullable = false)
    private boolean active;

    @Column(nullable = false)
    private Instant createdAt;

    private Instant endedAt;

    protected StoredMemoryRelation() {
    }

    public StoredMemoryRelation(
            String workspaceId,
            String originType,
            String originId,
            String destinationType,
            String destinationId,
            String relationType,
            String source,
            String notes,
            Instant now
    ) {
        this.workspaceId = workspaceId;
        this.originType = originType;
        this.originId = originId;
        this.destinationType = destinationType;
        this.destinationId = destinationId;
        this.relationType = relationType;
        this.source = source;
        this.notes = notes;
        this.active = true;
        this.createdAt = now;
    }

    public void end(Instant now) {
        this.active = false;
        this.endedAt = now;
    }

    public Long getId() {
        return id;
    }
}
