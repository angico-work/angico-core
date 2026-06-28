package com.angico.acoes;

import java.time.Instant;

public record AcaoResponse(
        Long id,
        String workspaceId,
<<<<<<< HEAD
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
=======
        Long territorioId,
        Long missaoId,
        String titulo,
        String descricao,
        String status,
        String responsavelId,
        String resultadoDescricao,
        Double latitude,
        Double longitude,
        Instant updatedAt
) {
>>>>>>> origin
}
