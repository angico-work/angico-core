package com.angico.acoes;

import java.time.Instant;

public record AcaoResponse(
        Long id,
        String workspaceId,
        String titulo,
        String descricao,
        String status,
        String missaoId,
        String responsavelId,
        Instant createdAt
) {

    public static AcaoResponse from(Acao a) {
        return new AcaoResponse(
                a.getId(),
                a.getWorkspaceId(),
                a.getTitulo(),
                a.getDescricao(),
                a.getStatus(),
                a.getMissaoId(),
                a.getResponsavelId(),
                a.getCreatedAt()
        );
    }
}
