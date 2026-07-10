package com.angico.missoes;

import jakarta.validation.constraints.NotBlank;

public record MissaoRequest(
        @NotBlank String workspaceId,
        String territorioId,
        @NotBlank String titulo,
        String descricao,
        String problemaId,
        String responsavelId
) {
}
