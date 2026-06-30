package com.angico.workspaces;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;

/**
 * A person's membership in a workspace, with a role that drives access control.
 * The {@code actorId} is the member's Angico ID (the human identity used across
 * the platform); {@code displayName} is denormalized for listing without a join.
 */
@Entity
@Table(name = "workspace_member", uniqueConstraints =
        @UniqueConstraint(name = "uk_member_workspace_actor", columnNames = {"workspaceId", "actorId"}))
public class WorkspaceMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String workspaceId;

    @Column(nullable = false)
    private String actorId;

    @Column(nullable = false)
    private String displayName;

    @Column(nullable = false)
    private String role;

    @Column(nullable = false)
    private String status;

    @Column(nullable = false)
    private Instant joinedAt;

    protected WorkspaceMember() {
    }

    public WorkspaceMember(String workspaceId, String actorId, String displayName, String role, String status, Instant joinedAt) {
        this.workspaceId = workspaceId;
        this.actorId = actorId;
        this.displayName = displayName;
        this.role = role;
        this.status = status;
        this.joinedAt = joinedAt;
    }

    public Long getId() {
        return id;
    }

    public String getWorkspaceId() {
        return workspaceId;
    }

    public String getActorId() {
        return actorId;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Instant getJoinedAt() {
        return joinedAt;
    }
}
