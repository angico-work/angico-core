package com.angico.acoes;

public record AcaoRequest(
        String workspaceId,
        Long territorioId,
        Long missaoId,
        String titulo,
        String descricao,
        String responsavelId,
        String resultadoDescricao,
        Double latitude,
        Double longitude,
        String actorId
) {
}
