package com.angico.core.geocoding;

import java.util.List;

public interface GeocodingProvider {
    List<GeocodingResult> search(String query, String country);
    GeocodingResult reverse(Double latitude, Double longitude);
}
