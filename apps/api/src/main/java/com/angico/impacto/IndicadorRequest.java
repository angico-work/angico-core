package com.angico.impacto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record IndicadorRequest(
        @NotBlank @Size(max = 255) String workspaceId,
        @NotNull @Positive Long territorioId,
        @Positive Long resultadoId,
        @NotBlank @Size(max = 200) String nome,
        @Size(max = 40) String unidade,
        @Size(max = 2000) String descricao
) {
}
