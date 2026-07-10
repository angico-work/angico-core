package com.angico.organizacoes;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public record ParticipacaoRequest(
        String workspaceId,
        @NotNull @Positive Long pessoaId,
        @NotBlank @Size(max = 40) String papel,
        @NotBlank @Size(max = 20) String status,
        @NotNull Instant startedAt,
        Instant endedAt
) {
}
