package com.angico.missoes;

import java.time.Instant;

public record MissaoResponse(
        Long id,
        String workspaceId,
        String titulo,
        String descricao,
        String status,
        int progresso,
        String problemaId,
        String responsavelId,
        Instant createdAt
) {

    public static MissaoResponse from(Missao m) {
        return new MissaoResponse(
                m.getId(),
                m.getWorkspaceId(),
                m.getTitulo(),
                m.getDescricao(),
                m.getStatus(),
                m.getProgresso(),
                m.getProblemaId(),
                m.getResponsavelId(),
                m.getCreatedAt()
        );
    }
}
