package com.angico.core.geocoding;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;

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
    private final BoundedTtlCache<List<GeocodingResult>> searchCache;
    private final BoundedTtlCache<GeocodingResult> reverseCache;

    public GeocodingService(
            GeocodingProvider provider,
            BrazilMunicipalitySearchService municipalitySearchService,
            @Value("${angico.geocoder.default-country:BR}") String defaultCountry,
            @Value("${angico.geocoder.cache-max-entries:256}") int cacheMaxEntries,
            @Value("${angico.geocoder.cache-ttl:PT30M}") Duration cacheTtl
    ) {
        this.provider = provider;
        this.municipalitySearchService = municipalitySearchService;
        this.defaultCountry = defaultCountry;
        this.searchCache = new BoundedTtlCache<>(cacheMaxEntries, cacheTtl);
        this.reverseCache = new BoundedTtlCache<>(cacheMaxEntries, cacheTtl);
    }

    public GeocodingSearchResponse search(String query, String country) {
        if (query == null || query.isBlank()) {
            return new GeocodingSearchResponse("", List.of());
        }
        String selectedCountry = canonicalCountry(country);
        String normalizedQuery = query.strip();
        if (normalizedQuery.length() > 160
                || normalizedQuery.codePoints().anyMatch(Character::isISOControl)) {
            throw new IllegalArgumentException("A busca deve ter no máximo 160 caracteres e não pode conter controles.");
        }
        String key = (selectedCountry + ":" + normalizedQuery).toLowerCase(Locale.ROOT);

        List<GeocodingResult> cached = searchCache.get(key);
        if (cached != null) {
            return new GeocodingSearchResponse(normalizedQuery, cached);
        }
        try {
            List<GeocodingResult> results = searchWithProviderAndFallback(normalizedQuery, selectedCountry);
            LOG.debug("[geocoding] search completed results={} hasCoords={}", results.size(), hasCoordinates(results));
            if (hasCoordinates(results)) {
                searchCache.put(key, results);
            }
            return new GeocodingSearchResponse(normalizedQuery, results);
        } catch (RuntimeException ex) {
            LOG.warn("[geocoding] providers unavailable; using municipality fallback ({})",
                    ex.getClass().getSimpleName());
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
        if (!Double.isFinite(latitude) || !Double.isFinite(longitude)
                || latitude < -90 || latitude > 90
                || longitude < -180 || longitude > 180) {
            throw new IllegalArgumentException("Coordenadas inválidas.");
        }
        String key = String.format(Locale.ROOT, "%.6f:%.6f", latitude, longitude);
        GeocodingResult cached = reverseCache.get(key);
        if (cached != null) {
            return cached;
        }
        GeocodingResult result = provider.reverse(latitude, longitude);
        if (result != null) {
            reverseCache.put(key, result);
        }
        return result;
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

    private String canonicalCountry(String requested) {
        String country = requested == null || requested.isBlank() ? defaultCountry : requested;
        String canonical = country == null ? "br" : country.strip().toLowerCase(Locale.ROOT);
        if ("brasil".equals(canonical)) {
            return "br";
        }
        if (!canonical.matches("[a-z]{2}")) {
            throw new IllegalArgumentException("País inválido.");
        }
        return canonical;
    }

    private static final class BoundedTtlCache<V> {

        private final int maxEntries;
        private final long ttlNanos;
        private final LinkedHashMap<String, CacheEntry<V>> entries = new LinkedHashMap<>(16, 0.75f, true);

        private BoundedTtlCache(int maxEntries, Duration ttl) {
            if (maxEntries < 1 || ttl == null || ttl.isNegative()) {
                throw new IllegalArgumentException("Configuração de cache inválida.");
            }
            this.maxEntries = maxEntries;
            long nanos;
            try {
                nanos = ttl.toNanos();
            } catch (ArithmeticException exception) {
                nanos = Long.MAX_VALUE;
            }
            this.ttlNanos = nanos;
        }

        private synchronized V get(String key) {
            CacheEntry<V> entry = entries.get(key);
            if (entry == null) {
                return null;
            }
            if (System.nanoTime() - entry.cachedAtNanos() >= ttlNanos) {
                entries.remove(key);
                return null;
            }
            return entry.value();
        }

        private synchronized void put(String key, V value) {
            if (!entries.containsKey(key) && entries.size() >= maxEntries) {
                entries.remove(entries.keySet().iterator().next());
            }
            entries.put(key, new CacheEntry<>(value, System.nanoTime()));
        }

        private record CacheEntry<V>(V value, long cachedAtNanos) {
        }
    }
}
