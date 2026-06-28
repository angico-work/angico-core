package com.angico.core.geocoding;

import java.util.List;

public record GeocodingResult(
        String displayName,
        String city,
        String neighborhood,
        String state,
        String country,
        Double latitude,
        Double longitude,
        List<Double> boundingBox
) {
}
