package com.angico.common.idempotency;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;

@Entity
@Table(
        name = "idempotency_record",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_idempotency_scope",
                columnNames = {"workspaceId", "actorId", "operationKind", "idempotencyKey"}
        ),
        indexes = @Index(
                name = "idx_idempotency_resource",
                columnList = "workspaceId,resourceType,resourceId"
        )
)
public class IdempotencyRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String workspaceId;

    @Column(nullable = false, length = 255)
    private String actorId;

    @Column(nullable = false, length = 80)
    private String operationKind;

    @Column(nullable = false, length = 128)
    private String idempotencyKey;

    @Column(nullable = false, length = 64)
    private String requestHash;

    @Column(length = 80)
    private String resourceType;

    @Column(length = 255)
    private String resourceId;

    private Integer responseStatus;

    @Column(length = 120)
    private String responseContentType;

    @Column(nullable = false)
    private Instant createdAt;

    private Instant completedAt;

    protected IdempotencyRecord() {
    }

    public IdempotencyRecord(
            String workspaceId,
            String actorId,
            IdempotencyOperation operation,
            String idempotencyKey,
            String requestHash,
            Instant createdAt
    ) {
        this.workspaceId = workspaceId;
        this.actorId = actorId;
        this.operationKind = operation.name();
        this.idempotencyKey = idempotencyKey;
        this.requestHash = requestHash;
        this.createdAt = createdAt;
    }

    public void complete(
            String resourceType,
            String resourceId,
            int responseStatus,
            String responseContentType,
            Instant completedAt
    ) {
        this.resourceType = resourceType;
        this.resourceId = resourceId;
        this.responseStatus = responseStatus;
        this.responseContentType = responseContentType;
        this.completedAt = completedAt;
    }

    public String getRequestHash() {
        return requestHash;
    }

    public String getOperationKind() {
        return operationKind;
    }

    public String getResourceType() {
        return resourceType;
    }

    public String getResourceId() {
        return resourceId;
    }

    public Integer getResponseStatus() {
        return responseStatus;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }
}
