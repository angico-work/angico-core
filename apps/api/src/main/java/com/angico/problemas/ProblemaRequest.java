package com.angico.problemas;

public record ProblemaRequest(
        String workspaceId,
        Long territorioId,
        Long observacaoId,
        String titulo,
        String descricao,
        String categoria,
        String prioridade,
        Integer severidade,
        Double latitude,
        Double longitude,
        String actorId
) {
}
