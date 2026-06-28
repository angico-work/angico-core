package com.angico.missoes;

import java.time.Instant;

public record MissaoResponse(
        Long id,
        String workspaceId,
<<<<<<< HEAD
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
=======
        Long territorioId,
        Long problemaId,
        String titulo,
        String descricao,
        String status,
        String prioridade,
        Integer progresso,
        Double latitude,
        Double longitude,
        String organizacaoId,
        Instant updatedAt
) {
>>>>>>> origin
}
