package com.angico.observacoes;

public record ObservacaoUpdateRequest(
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
        String actorId
) {
}
