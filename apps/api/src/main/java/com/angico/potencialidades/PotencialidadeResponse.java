package com.angico.potencialidades;

import java.time.Instant;

public record PotencialidadeResponse(
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
        String status,
        String autorId,
        Instant createdAt
) {

    public static PotencialidadeResponse from(PotencialidadeTerritorial p) {
        return new PotencialidadeResponse(
                p.getId(),
                p.getWorkspaceId(),
                p.getTerritorioId(),
                p.getCategoria(),
                p.getTitulo(),
                p.getDescricao(),
                p.getLocalizacao(),
                p.getLatitude(),
                p.getLongitude(),
                p.getStatus(),
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
        Integer prioridade,
        Double latitude,
        Double longitude,
        Instant updatedAt
) {
>>>>>>> origin
}
