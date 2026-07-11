package com.angico.territorios;

import com.angico.common.validation.CoordinatePair;
import com.angico.common.validation.ValidCoordinatePair;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

@ValidCoordinatePair
public record TerritorioCreateRequest(
        @NotBlank @Size(max = 255) String workspaceId,
        @NotBlank @Size(max = 255) String nome,
        @Size(max = 255) String tipo,
        @Size(max = 255) String cidade,
        @Size(max = 255) String bairro,
        @Size(max = 255) String estado,
        @Size(max = 255) String pais,
        Double latitude,
        Double longitude,
        @Size(max = 4) List<Double> boundingBox
) implements CoordinatePair {
}
