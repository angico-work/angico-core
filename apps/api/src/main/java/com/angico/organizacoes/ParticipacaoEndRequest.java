package com.angico.organizacoes;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;

public record ParticipacaoEndRequest(
        @NotBlank String workspaceId,
        @NotNull Instant endedAt
) {
}
