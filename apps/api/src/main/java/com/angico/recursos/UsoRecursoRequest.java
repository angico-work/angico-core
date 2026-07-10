package com.angico.recursos;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;

public record UsoRecursoRequest(
        String workspaceId,
        @NotNull @Positive Long acaoId,
        @NotNull @DecimalMin(value = "0", inclusive = false) @Digits(integer = 12, fraction = 4)
        BigDecimal quantidade,
        @NotBlank @Size(max = 40) String unidade,
        Instant occurredAt
) {
}
