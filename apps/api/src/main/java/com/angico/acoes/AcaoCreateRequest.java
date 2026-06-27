package com.angico.acoes;

import jakarta.validation.constraints.NotBlank;

/**
 * Payload to register a new ação. workspaceId/titulo are required; missaoId and
 * responsavelId enrich the ação's memory by linking it to a missão and a pessoa.
 */
public record AcaoCreateRequest(
        @NotBlank String workspaceId,
        @NotBlank String titulo,
        String descricao,
        String missaoId,
        String responsavelId
) {
}
