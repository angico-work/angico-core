package com.angico.intelligence;

import jakarta.persistence.*;
import java.time.Instant;

/** Mapping also makes the optional module available in local ddl-auto development databases. */
@Entity
@Table(name="intelligence_analysis",uniqueConstraints=@UniqueConstraint(name="uq_intelligence_request",columnNames={"workspace_id","actor_id","request_id"}))
public class IntelligenceAnalysis {
    @Id @Column(length=36) private String id;
    @Column(nullable=false) private String workspaceId;
    @Column(nullable=false) private String actorId;
    @Column(nullable=false,length=64) private String requestId;
    @Column(nullable=false,length=64) private String inputHash;
    @Column(nullable=false,length=32) private String entityType;
    @Column(nullable=false,columnDefinition="text") private String inputText;
    @Column(nullable=false,length=100) private String model;
    @Column(nullable=false,length=64) private String promptVersion;
    @Column(nullable=false,length=32) private String status;
    @Column(nullable=false,columnDefinition="text") private String sourcesJson;
    @Column(columnDefinition="text") private String responseJson;
    @Column(nullable=false) private int inputTokens;
    @Column(nullable=false) private int outputTokens;
    @Column(nullable=false) private Instant createdAt;
    private Instant completedAt;
    protected IntelligenceAnalysis() {}
}
