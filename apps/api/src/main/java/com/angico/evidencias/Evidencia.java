package com.angico.evidencias;

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
        name = "uk_evidencia_workspace_client_mutation",
        columnNames = {"workspaceId", "clientMutationId"}
))
public class Evidencia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String workspaceId;

    @Column(nullable = false, length = 40)
    private String subjectType;

    @Column(nullable = false)
    private Long subjectId;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(length = 2000)
    private String description;

    @Column(length = 180)
    private String originalFilename;

    @Column(length = 100)
    private String contentType;

    private Long sizeBytes;

    @Column(length = 64)
    private String sha256;

    @Column(length = 1000)
    private String storagePath;

    @Column(nullable = false)
    private Instant capturedAt;

    @Column(nullable = false)
    private Instant recordedAt;

    @Column(nullable = false)
    private String actorId;

    @Column(length = 128)
    private String deviceId;

    @Column(length = 128)
    private String clientMutationId;

    protected Evidencia() {
    }

    public Evidencia(
            String workspaceId,
            String subjectType,
            Long subjectId,
            String title,
            String description,
            Instant capturedAt,
            Instant recordedAt,
            String actorId,
            String deviceId,
            String clientMutationId
    ) {
        this.workspaceId = workspaceId;
        this.subjectType = subjectType;
        this.subjectId = subjectId;
        this.title = title;
        this.description = description;
        this.capturedAt = capturedAt;
        this.recordedAt = recordedAt;
        this.actorId = actorId;
        this.deviceId = deviceId;
        this.clientMutationId = clientMutationId;
    }

    public void attach(EvidenciaStorageService.StoredEvidence stored) {
        this.originalFilename = stored.originalFilename();
        this.contentType = stored.contentType();
        this.sizeBytes = stored.sizeBytes();
        this.sha256 = stored.sha256();
        this.storagePath = stored.path().toString();
    }

    public Long getId() {
        return id;
    }

    public String getWorkspaceId() {
        return workspaceId;
    }

    public String getSubjectType() {
        return subjectType;
    }

    public Long getSubjectId() {
        return subjectId;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public String getOriginalFilename() {
        return originalFilename;
    }

    public String getContentType() {
        return contentType;
    }

    public Long getSizeBytes() {
        return sizeBytes;
    }

    public String getSha256() {
        return sha256;
    }

    public String getStoragePath() {
        return storagePath;
    }

    public Instant getCapturedAt() {
        return capturedAt;
    }

    public Instant getRecordedAt() {
        return recordedAt;
    }

    public String getActorId() {
        return actorId;
    }

    public String getDeviceId() {
        return deviceId;
    }

    public String getClientMutationId() {
        return clientMutationId;
    }
}
