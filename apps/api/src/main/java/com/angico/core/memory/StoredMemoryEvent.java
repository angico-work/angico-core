package com.angico.core.memory;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(
        name = "memory_event",
        indexes = {
                @Index(name = "idx_event_workspace", columnList = "workspaceId"),
                @Index(name = "idx_event_entity", columnList = "workspaceId,entityType,entityId")
        }
)
public class StoredMemoryEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long sequence;

    @Column(nullable = false, updatable = false)
    private String eventId;

    @Column(nullable = false)
    private String workspaceId;

    @Column(nullable = false)
    private String entityType;

    @Column(nullable = false)
    private String entityId;

    @Column(nullable = false)
    private String eventType;

    @Column(nullable = false)
    private String source;

    private String actorId;
    private String deviceId;
    private String correlationId;
    private String causationId;

    @Column(nullable = false)
    private int schemaVersion;

    @Column(nullable = false)
    private Instant occurredAt;

    private Instant recordedAt;
    private String idempotencyKey;
    private String syncStatus;

    @Lob
    private String payloadJson;

    protected StoredMemoryEvent() {
    }

    public StoredMemoryEvent(
            String eventId,
            String workspaceId,
            String entityType,
            String entityId,
            String eventType,
            String source,
            String actorId,
            String deviceId,
            String correlationId,
            String causationId,
            int schemaVersion,
            Instant occurredAt,
            Instant recordedAt,
            String idempotencyKey,
            String syncStatus,
            String payloadJson
    ) {
        this.eventId = eventId;
        this.workspaceId = workspaceId;
        this.entityType = entityType;
        this.entityId = entityId;
        this.eventType = eventType;
        this.source = source;
        this.actorId = actorId;
        this.deviceId = deviceId;
        this.correlationId = correlationId;
        this.causationId = causationId;
        this.schemaVersion = schemaVersion;
        this.occurredAt = occurredAt;
        this.recordedAt = recordedAt;
        this.idempotencyKey = idempotencyKey;
        this.syncStatus = syncStatus;
        this.payloadJson = payloadJson;
    }

    public Long getSequence() {
        return sequence;
    }

    public String getEventId() {
        return eventId;
    }

    public String getWorkspaceId() {
        return workspaceId;
    }

    public String getEntityType() {
        return entityType;
    }

    public String getEntityId() {
        return entityId;
    }

    public String getEventType() {
        return eventType;
    }

    public String getActorId() {
        return actorId;
    }

    public String getSource() {
        return source;
    }

    public String getDeviceId() {
        return deviceId;
    }

    public String getCorrelationId() {
        return correlationId;
    }

    public String getCausationId() {
        return causationId;
    }

    public int getSchemaVersion() {
        return schemaVersion;
    }

    public Instant getOccurredAt() {
        return occurredAt;
    }

    public Instant getRecordedAt() {
        return recordedAt;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public String getSyncStatus() {
        return syncStatus == null ? MemorySyncStatus.SERVER_RECORDED.name() : syncStatus;
    }

    public String getPayloadJson() {
        return payloadJson;
    }
}
