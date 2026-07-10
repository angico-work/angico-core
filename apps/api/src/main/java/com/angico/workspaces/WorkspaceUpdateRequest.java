package com.angico.workspaces;

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
