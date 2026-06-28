package com.angico.observacoes;

<<<<<<< HEAD
import jakarta.validation.constraints.NotBlank;

/**
 * Payload to register a new observação. Only categoria/titulo are strictly
 * required; the rest enrich the record and the território's memory.
 */
public record ObservacaoCreateRequest(
        @NotBlank String workspaceId,
        String territorioId,
        @NotBlank String categoria,
        @NotBlank String titulo,
        String descricao,
        String localizacao,
        Double latitude,
        Double longitude,
        String urgencia,
        String autorId
=======
public record ObservacaoCreateRequest(
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
        String actorId
>>>>>>> origin
) {
}
