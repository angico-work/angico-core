package com.angico.acoes;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AcaoCreateRequest(
        @NotBlank @Size(max = 255) String workspaceId,
        @NotBlank @Size(max = 255) String titulo,
        @Size(max = 2000) String descricao,
        @Size(max = 255) String missaoId,
        @Size(max = 255) String responsavelId
) {
}
