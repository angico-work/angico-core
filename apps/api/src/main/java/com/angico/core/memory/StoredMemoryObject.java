package com.angico.core.memory;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;

/**
 * Current snapshot of an objeto in the território graph (Observação, Problema,
 * Missão, Pessoa, ...), identified by (workspaceId, entityType, entityId).
 * Upserted from domain events so the graph always reflects the latest state.
 */
@Entity
@Table(
        name = "memory_object",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_object_identity",
                columnNames = {"workspaceId", "entityType", "entityId"}
        )
)
public class StoredMemoryObject {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String workspaceId;

    @Column(nullable = false)
    private String entityType;

    @Column(nullable = false)
    private String entityId;

    private String externalCode;
    private String name;
    private String status;
    private String source;

    @Column(nullable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    protected StoredMemoryObject() {
    }

    public StoredMemoryObject(
            String workspaceId,
            String entityType,
            String entityId,
            String externalCode,
            String name,
            String status,
            String source,
            Instant now
    ) {
        this.workspaceId = workspaceId;
        this.entityType = entityType;
        this.entityId = entityId;
        this.externalCode = externalCode;
        this.name = name;
        this.status = status;
        this.source = source;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void update(String externalCode, String name, String status, String source, Instant now) {
        if (externalCode != null) {
            this.externalCode = externalCode;
        }
        if (name != null) {
            this.name = name;
        }
        if (status != null) {
            this.status = status;
        }
        if (source != null) {
            this.source = source;
        }
        this.updatedAt = now;
    }

    public Long getId() {
        return id;
    }

    public String getEntityType() {
        return entityType;
    }

    public String getEntityId() {
        return entityId;
    }

    public String getStatus() {
        return status;
    }
}
