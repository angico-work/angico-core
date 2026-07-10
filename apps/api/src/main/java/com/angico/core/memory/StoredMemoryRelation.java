package com.angico.core.memory;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Locale;

@Entity
@Table(
        name = "memory_relation",
        indexes = @Index(
                name = "idx_relation_origin",
                columnList = "workspaceId,originType,originId,relationType,active"),
        uniqueConstraints = @UniqueConstraint(
                name = "uq_memory_relation_active_identity",
                columnNames = "active_identity")
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
    private String actorId;

    @Column(precision = 5, scale = 4)
    private BigDecimal confidence;

    @Column(name = "active_identity", length = 64)
    private String activeIdentity;

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
        this(
                workspaceId,
                originType,
                originId,
                destinationType,
                destinationId,
                relationType,
                MemoryRelationMetadata.fromLegacy(source, notes),
                now
        );
    }

    public StoredMemoryRelation(
            String workspaceId,
            String originType,
            String originId,
            String destinationType,
            String destinationId,
            String relationType,
            MemoryRelationMetadata metadata,
            Instant now
    ) {
        this.workspaceId = workspaceId;
        this.originType = originType;
        this.originId = originId;
        this.destinationType = destinationType;
        this.destinationId = destinationId;
        this.relationType = relationType;
        this.source = metadata.source();
        this.notes = metadata.context();
        this.actorId = metadata.actorId();
        this.confidence = metadata.confidence();
        this.active = true;
        this.activeIdentity = activeIdentityFor(
                workspaceId, originType, originId, destinationType, destinationId, relationType);
        this.createdAt = now;
    }

    public void end(Instant now) {
        this.active = false;
        this.activeIdentity = null;
        this.endedAt = now;
    }

    public void claimActiveIdentity(String activeIdentity) {
        if (active) {
            this.activeIdentity = activeIdentity;
        }
    }

    public static String activeIdentityFor(
            String workspaceId,
            String originType,
            String originId,
            String destinationType,
            String destinationId,
            String relationType
    ) {
        String canonical = String.join("\u0000",
                workspaceId.strip(),
                originType.strip().toUpperCase(Locale.ROOT),
                originId.strip(),
                destinationType.strip().toUpperCase(Locale.ROOT),
                destinationId.strip(),
                relationType.strip().toUpperCase(Locale.ROOT));
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(canonical.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 indisponivel.", ex);
        }
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

    public String getActorId() {
        return actorId;
    }

    public BigDecimal getConfidence() {
        return confidence;
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
