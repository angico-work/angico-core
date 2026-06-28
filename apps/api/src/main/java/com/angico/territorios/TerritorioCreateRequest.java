package com.angico.territorios;

import java.util.List;

public record TerritorioCreateRequest(
        String workspaceId,
        String nome,
        String tipo,
        String cidade,
        String bairro,
        String estado,
        String pais,
        Double latitude,
        Double longitude,
        List<Double> boundingBox
) {
}
