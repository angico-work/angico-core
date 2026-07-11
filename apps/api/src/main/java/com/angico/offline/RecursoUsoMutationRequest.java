package com.angico.offline;

import com.angico.recursos.UsoRecursoRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record RecursoUsoMutationRequest(
        @NotNull @Positive Long recursoId,
        @Valid @NotNull UsoRecursoRequest payload
) {
}
