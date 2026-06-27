package com.angico.problemas;

import java.time.Instant;

public record ProblemaResponse(
        Long id,
        String workspaceId,
        Long territorioId,
        Long observacaoId,
        String titulo,
        String descricao,
        String categoria,
        String status,
        String prioridade,
        Integer severidade,
        Double latitude,
        Double longitude,
        Instant updatedAt
) {
}
