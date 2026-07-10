package com.angico.core.geocoding;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class NominatimGeocodingProvider implements GeocodingProvider {

    private static final Logger LOG = LoggerFactory.getLogger(NominatimGeocodingProvider.class);

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(4))
            .version(HttpClient.Version.HTTP_1_1)
            .build();
    private final ObjectMapper objectMapper;
    private final String userAgent;

    public NominatimGeocodingProvider(
            ObjectMapper objectMapper,
            @Value("${angico.geocoder.user-agent}") String userAgent
    ) {
        this.objectMapper = objectMapper;
        this.userAgent = userAgent;
    }

    @Override
    public List<GeocodingResult> search(String query, String country) {
        String countryParam = country == null || country.isBlank()
                ? "br"
                : country.trim().toLowerCase();
        try {
            List<GeocodingResult> photonResults = photonSearch(query, countryParam);
            if (!photonResults.isEmpty()) {
                LOG.debug("Photon answered '{}' with {} result(s)", query, photonResults.size());
                return photonResults;
            }
            LOG.warn("Photon returned 0 results for '{}'; falling back to Nominatim", query);
        } catch (RuntimeException ex) {
            LOG.warn("Photon search failed for '{}' ({}); falling back to Nominatim", query, ex.toString());
        }

        String encodedQuery = encode(query);
        URI uri = URI.create("https://nominatim.openstreetmap.org/search"
                + "?format=jsonv2&addressdetails=1&limit=5"
                + "&countrycodes=" + encode(countryParam)
                + "&q=" + encodedQuery);

        JsonNode root = request(uri);
        List<GeocodingResult> results = new ArrayList<>();
        root.forEach(node -> results.add(toResult(node)));
        LOG.debug("Nominatim answered '{}' with {} result(s)", query, results.size());
        return results;
    }

    @Override
    public GeocodingResult reverse(Double latitude, Double longitude) {
        URI uri = URI.create("https://nominatim.openstreetmap.org/reverse"
                + "?format=jsonv2&addressdetails=1"
                + "&lat=" + latitude
                + "&lon=" + longitude);
        try {
            return toResult(request(uri));
        } catch (IllegalStateException ex) {
            return photonReverse(latitude, longitude);
        }
    }

    private JsonNode request(URI uri) {
        HttpRequest request = HttpRequest.newBuilder(uri)
                .timeout(Duration.ofSeconds(8))
                .version(HttpClient.Version.HTTP_1_1)
                .header("User-Agent", userAgent)
                .header("Referer", "https://angico.local")
                .header("Accept-Language", "pt-BR,pt;q=0.9,en;q=0.7")
                .header("Accept", "application/json")
                .GET()
                .build();
        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new IllegalStateException("Geocoder retornou HTTP " + response.statusCode());
            }
            return objectMapper.readTree(response.body());
        } catch (IOException | JacksonException ex) {
            throw new IllegalStateException("Falha ao consultar geocoder.", ex);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Consulta ao geocoder interrompida.", ex);
        }
    }

    private List<GeocodingResult> photonSearch(String query, String country) {
        URI uri = URI.create("https://photon.komoot.io/api/"
                + "?limit=5&lang=en"
                + "&q=" + encode(query));
        JsonNode features = requestPhoton(uri).path("features");
        List<GeocodingResult> results = new ArrayList<>();
        features.forEach(feature -> {
            GeocodingResult result = photonResult(feature);
            if (country == null
                    || country.isBlank()
                    || country.equalsIgnoreCase(text(feature.path("properties").path("countrycode")))) {
                results.add(result);
            }
        });
        return results;
    }

    private GeocodingResult photonReverse(Double latitude, Double longitude) {
        URI uri = URI.create("https://photon.komoot.io/reverse"
                + "?limit=1&lang=en"
                + "&lat=" + latitude
                + "&lon=" + longitude);
        JsonNode features = requestPhoton(uri).path("features");
        if (!features.isArray() || features.isEmpty()) {
            return new GeocodingResult(
                    latitude + "," + longitude,
                    null,
                    null,
                    null,
                    null,
                    latitude,
                    longitude,
                    List.of()
            );
        }
        return photonResult(features.get(0));
    }

    private JsonNode requestPhoton(URI uri) {
        HttpRequest request = HttpRequest.newBuilder(uri)
                .timeout(Duration.ofSeconds(8))
                .version(HttpClient.Version.HTTP_1_1)
                .header("User-Agent", userAgent)
                .header("Accept", "application/json")
                .GET()
                .build();
        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new IllegalStateException("Geocoder secundario retornou HTTP " + response.statusCode());
            }
            return objectMapper.readTree(response.body());
        } catch (IOException | JacksonException ex) {
            throw new IllegalStateException("Falha ao consultar geocoder secundario.", ex);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Consulta ao geocoder secundario interrompida.", ex);
        }
    }

    private GeocodingResult photonResult(JsonNode feature) {
        JsonNode properties = feature.path("properties");
        JsonNode coordinates = feature.path("geometry").path("coordinates");
        Double longitude = coordinates.isArray() && coordinates.size() > 0 ? asDouble(coordinates.get(0)) : null;
        Double latitude = coordinates.isArray() && coordinates.size() > 1 ? asDouble(coordinates.get(1)) : null;
        String city = firstText(properties, "city", "county");
        String neighborhood = firstText(properties, "district", "locality", "name");
        String state = text(properties.path("state"));
        String country = text(properties.path("country"));
        // Stream.of tolerates null elements (List.of would throw NPE); a
        // municipality result, for instance, has no "city" property.
        String displayName = Stream.of(
                        text(properties.path("name")),
                        neighborhood,
                        city,
                        state,
                        country
                )
                .filter(value -> value != null && !value.isBlank())
                .distinct()
                .reduce((left, right) -> left + ", " + right)
                .orElse(latitude + "," + longitude);

        return new GeocodingResult(
                displayName,
                city,
                neighborhood,
                state,
                country,
                latitude,
                longitude,
                List.of()
        );
    }

    private GeocodingResult toResult(JsonNode node) {
        JsonNode address = node.path("address");
        return new GeocodingResult(
                text(node.path("display_name")),
                firstText(address, "city", "town", "village", "municipality"),
                firstText(address, "neighbourhood", "suburb", "city_district", "quarter"),
                text(address.path("state")),
                text(address.path("country")),
                asDouble(node.path("lat")),
                asDouble(node.path("lon")),
                boundingBox(node.path("boundingbox"))
        );
    }

    private List<Double> boundingBox(JsonNode node) {
        if (!node.isArray()) {
            return List.of();
        }
        List<Double> values = new ArrayList<>();
        node.forEach(item -> values.add(asDouble(item)));
        return values;
    }

    private String firstText(JsonNode node, String... fields) {
        for (String field : fields) {
            String value = text(node.path(field));
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    private String text(JsonNode node) {
        return node == null || node.isMissingNode() || node.isNull() ? null : node.asText();
    }

    private Double asDouble(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull() || node.asText().isBlank()) {
            return null;
        }
        return Double.valueOf(node.asText());
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
