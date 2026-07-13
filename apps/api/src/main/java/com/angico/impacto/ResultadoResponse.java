package com.angico.impacto;

import java.time.Instant;

public record ResultadoResponse(
        Long id,
        String workspaceId,
        Long acaoId,
        String titulo,
        String descricao,
        String status,
        String actorId,
        Instant occurredAt,
        Instant createdAt
) {
    public static ResultadoResponse from(Resultado result) {
        return new ResultadoResponse(
                result.getId(),
                result.getWorkspaceId(),
                result.getAcaoId(),
                result.getTitulo(),
                result.getDescricao(),
                result.getStatus(),
                result.getActorId(),
                result.getOccurredAt(),
                result.getCreatedAt()
        );
    }
}
