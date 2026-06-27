package com.angico.missoes;

public record MissaoRequest(
        String workspaceId,
        Long territorioId,
        Long problemaId,
        String titulo,
        String descricao,
        String prioridade,
        Double latitude,
        Double longitude,
        String organizacaoId,
        String actorId
) {
}
