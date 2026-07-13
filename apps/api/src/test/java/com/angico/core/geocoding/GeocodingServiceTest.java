package com.angico.core.geocoding;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.Test;

class GeocodingServiceTest {

    private final GeocodingProvider provider = mock(GeocodingProvider.class);
    private final BrazilMunicipalitySearchService municipalities = mock(BrazilMunicipalitySearchService.class);

    @Test
    void rejectsOversizedAndControlCharacterQueries() {
        GeocodingService service = service(10, Duration.ofMinutes(30));

        assertThrows(IllegalArgumentException.class, () -> service.search("a".repeat(161), "BR"));
        assertThrows(IllegalArgumentException.class, () -> service.search("Rua\nPrivada", "BR"));

        verifyNoInteractions(provider, municipalities);
    }

    @Test
    void rejectsInvalidCountriesAndCoordinates() {
        GeocodingService service = service(10, Duration.ofMinutes(30));

        assertThrows(IllegalArgumentException.class, () -> service.search("Recife", "country-without-limit"));
        assertThrows(IllegalArgumentException.class, () -> service.reverse(Double.NaN, 10d));
        assertThrows(IllegalArgumentException.class, () -> service.reverse(91d, 10d));
        assertThrows(IllegalArgumentException.class, () -> service.reverse(10d, -181d));

        verifyNoInteractions(provider, municipalities);
    }

    @Test
    void evictsTheLeastRecentlyUsedSearchWhenTheCacheIsFull() {
        GeocodingService service = service(1, Duration.ofMinutes(30));
        when(provider.search("Rua A", "br")).thenReturn(List.of(result("A", -8d, -35d)));
        when(provider.search("Rua B", "br")).thenReturn(List.of(result("B", -9d, -36d)));

        service.search("Rua A", "BR");
        service.search("Rua B", "BR");
        service.search("Rua A", "BR");

        verify(provider, times(2)).search("Rua A", "br");
    }

    @Test
    void expiresSearchEntriesAfterTheConfiguredTtl() {
        GeocodingService service = service(10, Duration.ZERO);
        when(provider.search("Rua A", "br")).thenReturn(List.of(result("A", -8d, -35d)));

        service.search("Rua A", "BR");
        service.search("Rua A", "BR");

        verify(provider, times(2)).search("Rua A", "br");
    }

    private GeocodingService service(int maxEntries, Duration ttl) {
        return new GeocodingService(provider, municipalities, "BR", maxEntries, ttl);
    }

    private GeocodingResult result(String name, Double latitude, Double longitude) {
        return new GeocodingResult(name, null, null, null, "Brasil", latitude, longitude, List.of());
    }
}
