package com.angico.core.geocoding;

import java.util.List;

public record GeocodingSearchResponse(
        String query,
        List<GeocodingResult> results,
        String error
) {
    public GeocodingSearchResponse(String query, List<GeocodingResult> results) {
        this(query, results, null);
    }
}
