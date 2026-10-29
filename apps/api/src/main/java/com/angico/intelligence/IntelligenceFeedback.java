package com.angico.intelligence;
import jakarta.persistence.*;
import java.time.Instant;
@Entity
@Table(name="intelligence_feedback",uniqueConstraints={
    @UniqueConstraint(name="uq_intelligence_feedback_request",columnNames={"analysis_id","actor_id","request_id"}),
    @UniqueConstraint(name="uq_intelligence_feedback_suggestion",columnNames={"analysis_id","actor_id","suggestion_id"})})
public class IntelligenceFeedback {
    @Id @Column(length=36) private String id;
    @Column(nullable=false,length=36) private String analysisId;
    @Column(nullable=false) private String actorId;
    @Column(nullable=false,length=64) private String suggestionId;
    @Column(nullable=false,length=16) private String decision;
    @Column(length=80) private String correctedCategory;
    @Column(length=80) private String reviewedCategory;
    @Column(nullable=false,length=64) private String requestId;
    @Column(nullable=false,length=64) private String inputHash;
    @Column(nullable=false) private Instant createdAt;
    protected IntelligenceFeedback() {}
}
