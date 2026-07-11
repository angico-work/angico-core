package com.angico.workspaces;

import com.angico.common.validation.CoordinatePair;
import com.angico.common.validation.ValidCoordinatePair;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@ValidCoordinatePair
public record WorkspaceCreateRequest(
        @NotBlank @Size(max = 255) String nome,
        @Size(max = 2000) String descricao,
        @Size(max = 255) String cidade,
        @Size(max = 255) String estado,
        Double centerLatitude,
        Double centerLongitude
) implements CoordinatePair {

    @Override
    public Double latitude() {
        return centerLatitude;
    }

    @Override
    public Double longitude() {
        return centerLongitude;
    }
}
