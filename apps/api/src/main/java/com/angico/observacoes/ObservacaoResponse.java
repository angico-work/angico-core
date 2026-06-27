package com.angico.observacoes;

import java.time.Instant;

public record ObservacaoResponse(
        Long id,
        String workspaceId,
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
}
