package com.angico.acoes;

import jakarta.validation.constraints.NotBlank;

public record AcaoCreateRequest(
        @NotBlank String workspaceId,
        @NotBlank String titulo,
        String descricao,
        String missaoId,
        String responsavelId
) {
}
