package com.angico.observacoes;

import com.angico.common.validation.AllowedOccurrenceTime;
import com.angico.common.validation.CoordinatePair;
import com.angico.common.validation.ValidCoordinatePair;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;

@ValidCoordinatePair
public record ObservacaoCreateRequest(
        @NotBlank @Size(max = 255) String workspaceId,
        @Size(max = 255) String territorioId,
        @NotBlank @Size(max = 255) String categoria,
        @NotBlank @Size(max = 255) String titulo,
        @Size(max = 2000) String descricao,
        @Size(max = 255) String localizacao,
        @Size(max = 255) String bairro,
        @Size(max = 255) String cidade,
        @Size(max = 255) String estado,
        Double latitude,
        Double longitude,
        @Size(max = 255) String urgencia,
        @Pattern(regexp = "[A-Za-z0-9][A-Za-z0-9._:-]{0,127}") String clientMutationId,
        @AllowedOccurrenceTime Instant occurredAt,
        @Pattern(regexp = "[A-Za-z0-9][A-Za-z0-9._:-]{0,127}") String deviceId
) implements CoordinatePair {
}
