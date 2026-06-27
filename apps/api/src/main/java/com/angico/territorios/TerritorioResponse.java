package com.angico.territorios;

import java.time.Instant;
import java.util.List;

public record TerritorioResponse(
        Long id,
        String workspaceId,
        String nome,
        String tipo,
        String cidade,
        String bairro,
        String estado,
        String pais,
        Double latitude,
        Double longitude,
        List<Double> boundingBox,
        String status,
        Instant updatedAt
) {
}
