package com.angico.workspaces;

import jakarta.validation.constraints.NotBlank;

public record WorkspaceCreateRequest(
        @NotBlank String nome,
        String descricao,
        String cidade,
        String estado,
        Double centerLatitude,
        Double centerLongitude,
        String criadoPor
) {
}
