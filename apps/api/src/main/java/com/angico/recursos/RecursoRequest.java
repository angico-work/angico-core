package com.angico.recursos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RecursoRequest(
        @NotBlank @Size(max = 255) String workspaceId,
        @NotBlank @Size(max = 200) String nome,
        @NotBlank @Size(max = 40) String categoria,
        @NotBlank @Size(max = 40) String unidade,
        @Size(max = 2000) String descricao
) {
}
