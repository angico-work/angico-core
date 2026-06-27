package com.angico.missoes;

import java.time.Instant;

public record MissaoResponse(
        Long id,
        String workspaceId,
        Long territorioId,
        Long problemaId,
        String titulo,
        String descricao,
        String status,
        String prioridade,
        Integer progresso,
        Double latitude,
        Double longitude,
        String organizacaoId,
        Instant updatedAt
) {
}
