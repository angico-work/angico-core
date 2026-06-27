package com.angico.territorios;

import java.util.List;

public record TerritorioUpdateRequest(
        String nome,
        String tipo,
        String cidade,
        String bairro,
        String estado,
        String pais,
        Double latitude,
        Double longitude,
        List<Double> boundingBox,
        String status
) {
}
