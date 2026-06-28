package com.angico.impacto;

public record IndicadorRequest(
        String workspaceId,
        Long territorioId,
        Long resultadoId,
        String nome,
        String unidade,
        String descricao,
        String actorId
) {
}
