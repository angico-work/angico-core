package com.angico.potencialidades;

import java.time.Instant;

public record PotencialidadeResponse(
        Long id,
        String workspaceId,
        Long territorioId,
        Long observacaoId,
        String titulo,
        String descricao,
        String categoria,
        String status,
        Integer prioridade,
        Double latitude,
        Double longitude,
        Instant updatedAt
) {
}
