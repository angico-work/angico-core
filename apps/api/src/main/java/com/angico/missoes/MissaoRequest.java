package com.angico.missoes;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record MissaoRequest(
        @NotBlank @Size(max = 255) String workspaceId,
        @Size(max = 255) String territorioId,
        @NotBlank @Size(max = 255) String titulo,
        @Size(max = 2000) String descricao,
        @Size(max = 255) String problemaId,
        @Size(max = 255) String responsavelId
) {
}
