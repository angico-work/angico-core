package com.angico.core.geocoding;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class GeocodingService {

    private static final Logger LOG = LoggerFactory.getLogger(GeocodingService.class);

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

        List<GeocodingResult> cached = searchCache.get(key);
        if (cached != null) {
            return new GeocodingSearchResponse(normalizedQuery, cached);
        }
        try {
            List<GeocodingResult> results = searchWithProviderAndFallback(normalizedQuery, selectedCountry);
            LOG.debug("[geocoding] key='{}' results={} hasCoords={}", key, results.size(), hasCoordinates(results));
            // Only cache geolocated answers. A coordinate-less result means the
            // provider was unavailable and we served the IBGE municipality list;
            // caching it would pin a degraded answer forever, so we leave the key
            // empty and let the next request retry the provider.
            if (hasCoordinates(results)) {
                searchCache.put(key, results);
            }
            return new GeocodingSearchResponse(normalizedQuery, results);
        } catch (RuntimeException ex) {
            LOG.warn("[geocoding] provider failed for '{}'; using municipality fallback", normalizedQuery, ex);
            List<GeocodingResult> fallbackResults = municipalityFallback(normalizedQuery, selectedCountry);
            if (!fallbackResults.isEmpty()) {
                return new GeocodingSearchResponse(normalizedQuery, fallbackResults);
            }
            return new GeocodingSearchResponse(
                    normalizedQuery,
                    List.of(),
                    "Geocodificador indisponivel no momento."
            );
        }
    }

    public GeocodingResult reverse(Double latitude, Double longitude) {
        if (latitude == null || longitude == null) {
            throw new IllegalArgumentException("lat e lng sao obrigatorios.");
        }
        String key = String.format(Locale.ROOT, "%.6f:%.6f", latitude, longitude);
        return reverseCache.computeIfAbsent(key, ignored -> provider.reverse(latitude, longitude));
    }

    private boolean hasCoordinates(List<GeocodingResult> results) {
        return results.stream().anyMatch(r -> r.latitude() != null && r.longitude() != null);
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
