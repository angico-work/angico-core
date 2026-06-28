package com.angico.potencialidades;

public record PotencialidadeRequest(
        String workspaceId,
        Long territorioId,
        Long observacaoId,
        String titulo,
        String descricao,
        String categoria,
        Integer prioridade,
        Double latitude,
        Double longitude,
        String actorId
) {
}
