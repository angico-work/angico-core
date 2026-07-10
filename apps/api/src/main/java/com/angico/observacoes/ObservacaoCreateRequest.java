package com.angico.observacoes;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import java.time.Instant;

public record ObservacaoCreateRequest(
        @NotBlank String workspaceId,
        String territorioId,
        @NotBlank String categoria,
        @NotBlank String titulo,
        String descricao,
        String localizacao,
        String bairro,
        String cidade,
        String estado,
        Double latitude,
        Double longitude,
        String urgencia,
        String autorId,
        @Pattern(regexp = "[A-Za-z0-9][A-Za-z0-9._:-]{0,127}") String clientMutationId,
        Instant occurredAt,
        @Pattern(regexp = "[A-Za-z0-9][A-Za-z0-9._:-]{0,127}") String deviceId
) {
}
