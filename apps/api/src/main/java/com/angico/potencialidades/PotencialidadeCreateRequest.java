package com.angico.potencialidades;

import jakarta.validation.constraints.NotBlank;

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
