package com.angico.missoes;

import jakarta.validation.constraints.NotBlank;

/**
 * Payload to register a new missão. Only workspaceId/titulo are strictly
 * required; problemaId/responsavelId enrich the território's memory.
 */
public record MissaoRequest(
        @NotBlank String workspaceId,
        @NotBlank String titulo,
        String descricao,
        String problemaId,
        String responsavelId
) {
}
