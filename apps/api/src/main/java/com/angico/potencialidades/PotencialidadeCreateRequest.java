package com.angico.potencialidades;

import jakarta.validation.constraints.NotBlank;

/**
 * Payload to register a new potencialidade. Only categoria/titulo are strictly
 * required; the rest enrich the record and the território's memory.
 */
public record PotencialidadeCreateRequest(
        @NotBlank String workspaceId,
        String territorioId,
        @NotBlank String categoria,
        @NotBlank String titulo,
        String descricao,
        String localizacao,
        Double latitude,
        Double longitude,
        String autorId
) {
}
