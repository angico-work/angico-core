package com.angico.core.geocoding;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class GeocodingService {

    private final GeocodingProvider provider;
    private final BrazilMunicipalitySearchService municipalitySearchService;
    private final String defaultCountry;
    private final Map<String, List<GeocodingResult>> searchCache = new ConcurrentHashMap<>();
    private final Map<String, GeocodingResult> reverseCache = new ConcurrentHashMap<>();

    public GeocodingService(
            GeocodingProvider provider,
            BrazilMunicipalitySearchService municipalitySearchService,
            @Value("${angico.geocoder.default-country:BR}") String defaultCountry
    ) {
        this.provider = provider;
        this.municipalitySearchService = municipalitySearchService;
        this.defaultCountry = defaultCountry;
    }

    public GeocodingSearchResponse search(String query, String country) {
        if (query == null || query.isBlank()) {
            return new GeocodingSearchResponse("", List.of());
        }
        String selectedCountry = country == null || country.isBlank() ? defaultCountry : country;
        String normalizedQuery = query.trim();
        String key = (selectedCountry + ":" + normalizedQuery).toLowerCase(Locale.ROOT);
        try {
            List<GeocodingResult> results = searchCache.computeIfAbsent(
                    key,
                    ignored -> searchWithProviderAndFallback(normalizedQuery, selectedCountry)
            );
            return new GeocodingSearchResponse(normalizedQuery, results);
        } catch (RuntimeException ex) {
            List<GeocodingResult> fallbackResults = municipalityFallback(normalizedQuery, selectedCountry);
            if (!fallbackResults.isEmpty()) {
                return new GeocodingSearchResponse(normalizedQuery, fallbackResults);
            }
            return new GeocodingSearchResponse(
                    normalizedQuery,
                    List.of(),
                    "Geocodificador indisponível no momento."
            );
        }
    }

    public GeocodingResult reverse(Double latitude, Double longitude) {
        if (latitude == null || longitude == null) {
            throw new IllegalArgumentException("lat e lng são obrigatórios.");
        }
        String key = String.format(Locale.ROOT, "%.6f:%.6f", latitude, longitude);
        return reverseCache.computeIfAbsent(key, ignored -> provider.reverse(latitude, longitude));
    }

    private List<GeocodingResult> searchWithProviderAndFallback(String query, String country) {
        List<GeocodingResult> providerResults = provider.search(query, country);
        if (!providerResults.isEmpty()) {
            return providerResults;
        }
        return municipalityFallback(query, country);
    }

    private List<GeocodingResult> municipalityFallback(String query, String country) {
        String selectedCountry = country == null ? "" : country.trim().toLowerCase(Locale.ROOT);
        if (!selectedCountry.isBlank() && !selectedCountry.equals("br") && !selectedCountry.equals("brasil")) {
            return List.of();
        }
        return municipalitySearchService.search(query, 8);
    }
}
