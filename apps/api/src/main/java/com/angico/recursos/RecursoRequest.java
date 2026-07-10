package com.angico.recursos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RecursoRequest(
        String workspaceId,
        @NotBlank @Size(max = 200) String nome,
        @NotBlank @Size(max = 40) String categoria,
        @NotBlank @Size(max = 40) String unidade,
        @Size(max = 2000) String descricao
) {
}
