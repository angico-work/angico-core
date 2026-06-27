package com.angico.acoes;

import java.time.Instant;

public record AcaoResponse(
        Long id,
        String workspaceId,
        Long territorioId,
        Long missaoId,
        String titulo,
        String descricao,
        String status,
        String responsavelId,
        String resultadoDescricao,
        Double latitude,
        Double longitude,
        Instant updatedAt
) {
}
