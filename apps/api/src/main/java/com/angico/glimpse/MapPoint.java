package com.angico.glimpse;

/**
 * A geolocated objeto for the território map. {@code type} is one of
 * observacao | problema | potencialidade, driving the marker colour client-side.
 */
public record MapPoint(
        String type,
        Long id,
        String titulo,
        String categoria,
        String status,
        double latitude,
        double longitude
) {
}
