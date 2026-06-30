package com.angico.workspaces;

import java.time.Instant;

public record WorkspaceMemberResponse(
        Long id,
        String workspaceId,
        String actorId,
        String displayName,
        String role,
        String status,
        Instant joinedAt
) {

    public static WorkspaceMemberResponse from(WorkspaceMember member) {
        return new WorkspaceMemberResponse(
                member.getId(),
                member.getWorkspaceId(),
                member.getActorId(),
                member.getDisplayName(),
                member.getRole(),
                member.getStatus(),
                member.getJoinedAt()
        );
    }
}
