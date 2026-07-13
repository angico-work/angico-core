package com.angico.impacto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public record MedicaoRequest(
        @NotBlank @Size(max = 255) String workspaceId,
        @NotNull @Positive Long indicadorId,
        @NotNull Double valor,
        @Size(max = 40) String unidade,
        @Size(max = 255) String fonte,
        Instant measuredAt
) {
}
