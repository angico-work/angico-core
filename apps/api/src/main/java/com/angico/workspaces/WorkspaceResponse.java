package com.angico.workspaces;

import java.time.Instant;

public record WorkspaceResponse(
        String slug,
        String nome,
        String descricao,
        String cidade,
        String estado,
        Double centerLatitude,
        Double centerLongitude,
        String status,
        String role,
        String createdBy,
        Instant createdAt,
        Instant updatedAt
) {

    public static WorkspaceResponse from(Workspace workspace, String role) {
        return new WorkspaceResponse(
                workspace.getSlug(),
                workspace.getNome(),
                workspace.getDescricao(),
                workspace.getCidade(),
                workspace.getEstado(),
                workspace.getCenterLatitude(),
                workspace.getCenterLongitude(),
                workspace.getStatus() == null ? "ACTIVE" : workspace.getStatus(),
                role,
                workspace.getCreatedBy(),
                workspace.getCreatedAt(),
                workspace.getUpdatedAt() == null ? workspace.getCreatedAt() : workspace.getUpdatedAt()
        );
    }
}
