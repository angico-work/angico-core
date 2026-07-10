package com.angico.core.memory;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.Instant;

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

    public String getWorkspaceId() {
        return workspaceId;
    }

    public String getOriginType() {
        return originType;
    }

    public String getOriginId() {
        return originId;
    }

    public String getDestinationType() {
        return destinationType;
    }

    public String getDestinationId() {
        return destinationId;
    }

    public String getRelationType() {
        return relationType;
    }

    public String getSource() {
        return source;
    }

    public String getNotes() {
        return notes;
    }

    public boolean isActive() {
        return active;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getEndedAt() {
        return endedAt;
    }
}
