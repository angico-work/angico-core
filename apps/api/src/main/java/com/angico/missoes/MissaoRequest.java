package com.angico.missoes;

import jakarta.validation.constraints.NotBlank;

/**
 * Payload to register a new missão. Only workspaceId/titulo are strictly
 * required; territorioId/problemaId/responsavelId enrich the território's
 * memory when the caller has an explicit reference.
 */
public record MissaoRequest(
        @NotBlank String workspaceId,
        String territorioId,
        @NotBlank String titulo,
        String descricao,
        String problemaId,
        String responsavelId
) {
}
