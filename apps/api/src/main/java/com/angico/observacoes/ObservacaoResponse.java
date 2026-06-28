package com.angico.observacoes;

import java.time.Instant;

public record ObservacaoResponse(
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
        String urgencia,
        String status,
        String autorId,
        Instant createdAt
) {

    public static ObservacaoResponse from(ObservacaoTerritorial o) {
        return new ObservacaoResponse(
                o.getId(),
                o.getWorkspaceId(),
                o.getTerritorioId(),
                o.getCategoria(),
                o.getTitulo(),
                o.getDescricao(),
                o.getLocalizacao(),
                o.getLatitude(),
                o.getLongitude(),
                o.getUrgencia(),
                o.getStatus(),
                o.getAutorId(),
                o.getCreatedAt()
        );
    }
=======
        Long territorioId,
        String titulo,
        String descricao,
        String categoria,
        String tipo,
        String status,
        Integer severidade,
        String evidenciaInicial,
        String localDescricao,
        String cidade,
        String bairro,
        Double latitude,
        Double longitude,
        String actorId,
        Long problemaId,
        Long potencialidadeId,
        Instant createdAt,
        Instant updatedAt
) {
>>>>>>> origin
}
