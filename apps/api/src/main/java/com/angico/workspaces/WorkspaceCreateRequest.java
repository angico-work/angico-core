package com.angico.workspaces;

import jakarta.validation.constraints.NotBlank;

/**
 * Payload to create a workspace. Only the display {@code nome} is required; the
 * slug (partition key) is derived from it. The remaining fields are optional
 * metadata; {@code criadoPor} records who created it for the território memory.
 */
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
