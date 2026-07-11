package com.angico.potencialidades;

import com.angico.common.validation.CoordinatePair;
import com.angico.common.validation.ValidCoordinatePair;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@ValidCoordinatePair
public record PotencialidadeCreateRequest(
        @NotBlank @Size(max = 255) String workspaceId,
        @Size(max = 255) String territorioId,
        @NotBlank @Size(max = 255) String categoria,
        @NotBlank @Size(max = 255) String titulo,
        @Size(max = 2000) String descricao,
        @Size(max = 255) String localizacao,
        Double latitude,
        Double longitude
) implements CoordinatePair {
}
