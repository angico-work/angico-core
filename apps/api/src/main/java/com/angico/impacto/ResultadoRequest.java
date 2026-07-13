package com.angico.impacto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public record ResultadoRequest(
        @NotBlank @Size(max = 255) String workspaceId,
        @NotNull @Positive Long acaoId,
        @NotBlank @Size(max = 200) String titulo,
        @Size(max = 2000) String descricao,
        Instant occurredAt
) {
}
