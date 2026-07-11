package com.angico.glimpse;

public record MapPoint(
        String workspaceId,
        String type,
        Long id,
        String titulo,
        String categoria,
        String status,
        double latitude,
        double longitude
) {
}
