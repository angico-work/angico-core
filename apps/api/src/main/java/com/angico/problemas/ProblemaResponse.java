package com.angico.problemas;

import java.time.Instant;

public record ProblemaResponse(
        Long id,
        String workspaceId,
<<<<<<< HEAD
        String territorioId,
        String categoria,
        String titulo,
        String descricao,
        String localizacao,
        Double latitude,
        Double longitude,
        String severidade,
        String status,
        String origemObservacaoId,
        String autorId,
        Instant createdAt
) {

    public static ProblemaResponse from(ProblemaSocioambiental p) {
        return new ProblemaResponse(
                p.getId(),
                p.getWorkspaceId(),
                p.getTerritorioId(),
                p.getCategoria(),
                p.getTitulo(),
                p.getDescricao(),
                p.getLocalizacao(),
                p.getLatitude(),
                p.getLongitude(),
                p.getSeveridade(),
                p.getStatus(),
                p.getOrigemObservacaoId(),
                p.getAutorId(),
                p.getCreatedAt()
        );
    }
=======
        Long territorioId,
        Long observacaoId,
        String titulo,
        String descricao,
        String categoria,
        String status,
        String prioridade,
        Integer severidade,
        Double latitude,
        Double longitude,
        Instant updatedAt
) {
>>>>>>> origin
}
