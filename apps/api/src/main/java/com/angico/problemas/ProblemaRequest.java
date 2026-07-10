package com.angico.problemas;

import jakarta.validation.constraints.NotBlank;

public record ProblemaRequest(
        @NotBlank String workspaceId,
        String territorioId,
        @NotBlank String categoria,
        @NotBlank String titulo,
        String descricao,
        String localizacao,
        Double latitude,
        Double longitude,
        String severidade,
        String origemObservacaoId,
        String autorId
) {
}
