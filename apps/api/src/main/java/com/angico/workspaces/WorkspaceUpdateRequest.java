package com.angico.workspaces;

/**
 * Partial update for a workspace — every field is optional; only the non-null
 * ones are applied. Editing requires a managing role (see WorkspaceAccessService).
 */
public record WorkspaceUpdateRequest(
        String nome,
        String descricao,
        String cidade,
        String estado,
        Double centerLatitude,
        Double centerLongitude,
        String status
) {
}
