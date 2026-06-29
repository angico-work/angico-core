package com.angico.workspaces;

import java.time.Instant;

public record WorkspaceResponse(String slug, String nome, String createdBy, Instant createdAt) {

    public static WorkspaceResponse from(Workspace workspace) {
        return new WorkspaceResponse(
                workspace.getSlug(),
                workspace.getNome(),
                workspace.getCreatedBy(),
                workspace.getCreatedAt()
        );
    }
}
