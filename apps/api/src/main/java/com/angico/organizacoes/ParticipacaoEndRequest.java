package com.angico.organizacoes;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public record ParticipacaoEndRequest(
        @NotBlank @Size(max = 255) String workspaceId,
        @NotNull Instant endedAt
) {
}
