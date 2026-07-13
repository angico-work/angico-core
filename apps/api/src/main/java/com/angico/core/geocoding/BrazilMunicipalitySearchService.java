package com.angico.core.geocoding;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.text.Normalizer;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.Collectors;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

@Service
public class BrazilMunicipalitySearchService {

    private static final URI IBGE_MUNICIPALITIES_URI = URI.create(
            "https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome"
    );
    private static final Set<String> UFS = Set.of(
            "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
            "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
            "SP", "SE", "TO"
    );
    private static final Map<String, String> STATE_NAMES_BY_UF = Map.ofEntries(
            Map.entry("AC", "Acre"),
            Map.entry("AL", "Alagoas"),
            Map.entry("AP", "Amapa"),
            Map.entry("AM", "Amazonas"),
            Map.entry("BA", "Bahia"),
            Map.entry("CE", "Ceara"),
            Map.entry("DF", "Distrito Federal"),
            Map.entry("ES", "Espirito Santo"),
            Map.entry("GO", "Goias"),
            Map.entry("MA", "Maranhao"),
            Map.entry("MT", "Mato Grosso"),
            Map.entry("MS", "Mato Grosso do Sul"),
            Map.entry("MG", "Minas Gerais"),
            Map.entry("PA", "Para"),
            Map.entry("PB", "Paraiba"),
            Map.entry("PR", "Parana"),
            Map.entry("PE", "Pernambuco"),
            Map.entry("PI", "Piaui"),
            Map.entry("RJ", "Rio de Janeiro"),
            Map.entry("RN", "Rio Grande do Norte"),
            Map.entry("RS", "Rio Grande do Sul"),
            Map.entry("RO", "Rondonia"),
            Map.entry("RR", "Roraima"),
            Map.entry("SC", "Santa Catarina"),
            Map.entry("SP", "Sao Paulo"),
            Map.entry("SE", "Sergipe"),
            Map.entry("TO", "Tocantins")
    );

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .version(HttpClient.Version.HTTP_1_1)
            .build();
    private final ObjectMapper objectMapper;
    private final AtomicReference<List<Municipality>> cache = new AtomicReference<>();

    public BrazilMunicipalitySearchService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public List<GeocodingResult> search(String query, int limit) {
        List<String> tokens = searchTokens(query);
        if (tokens.isEmpty()) {
            return List.of();
        }
        Set<String> ufFilters = ufFilters(tokens);
        List<String> filteredTokens = tokens.stream()
                .filter(token -> !UFS.contains(token.toUpperCase(Locale.ROOT)))
                .filter(token -> !"br".equals(token) && !"brasil".equals(token))
                .toList();
        List<String> textTokens = filteredTokens.isEmpty() ? tokens : filteredTokens;
        return municipalities().stream()
                .filter(municipality -> ufFilters.isEmpty() || ufFilters.contains(municipality.uf()))
                .filter(municipality -> matches(municipality, textTokens))
                .sorted(Comparator
                        .comparing((Municipality municipality) -> score(municipality, textTokens))
                        .thenComparing(Municipality::name)
                        .thenComparing(Municipality::uf))
                .limit(limit)
                .map(Municipality::toGeocodingResult)
                .toList();
    }

    private List<Municipality> municipalities() {
        List<Municipality> existing = cache.get();
        if (existing != null) {
            return existing;
        }
        List<Municipality> loaded = loadFromIbge();
        cache.compareAndSet(null, loaded);
        return cache.get();
    }

    private List<Municipality> loadFromIbge() {
        HttpRequest request = HttpRequest.newBuilder(IBGE_MUNICIPALITIES_URI)
                .timeout(Duration.ofSeconds(10))
                .header("Accept", "application/json")
                .GET()
                .build();
        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new IllegalStateException("IBGE retornou HTTP " + response.statusCode());
            }
            JsonNode root = objectMapper.readTree(response.body());
            List<Municipality> municipalities = new ArrayList<>();
            root.forEach(node -> {
                String name = text(node.path("nome"));
                JsonNode ufNode = node.path("microrregiao").path("mesorregiao").path("UF");
                String uf = text(ufNode.path("sigla"));
                String stateName = text(ufNode.path("nome"));
                if (name != null && uf != null) {
                    municipalities.add(new Municipality(
                            name,
                            uf,
                            stateName == null ? STATE_NAMES_BY_UF.getOrDefault(uf, uf) : stateName
                    ));
                }
            });
            return municipalities;
        } catch (IOException | JacksonException ex) {
            throw new IllegalStateException("Falha ao carregar municipios do IBGE.", ex);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Consulta ao IBGE interrompida.", ex);
        }
    }

    private Set<String> ufFilters(List<String> tokens) {
        Set<String> filters = new LinkedHashSet<>();
        tokens.stream()
                .map(token -> token.toUpperCase(Locale.ROOT))
                .filter(UFS::contains)
                .forEach(filters::add);
        String joined = String.join(" ", tokens);
        STATE_NAMES_BY_UF.forEach((uf, stateName) -> {
            if (joined.contains(normalize(stateName))) {
                filters.add(uf);
            }
        });
        return filters;
    }

    private boolean matches(Municipality municipality, List<String> tokens) {
        String haystack = normalize(String.join(
                " ",
                municipality.name(),
                municipality.uf(),
                municipality.stateName(),
                "Brasil"
        ));
        return tokens.stream().allMatch(haystack::contains);
    }

    private int score(Municipality municipality, List<String> tokens) {
        String name = normalize(municipality.name());
        String joined = String.join(" ", tokens);
        if (name.equals(joined)) {
            return 0;
        }
        if (name.startsWith(joined)) {
            return 1;
        }
        if (tokens.stream().anyMatch(name::startsWith)) {
            return 2;
        }
        return 3;
    }

    private List<String> searchTokens(String query) {
        if (query == null) {
            return List.of();
        }
        return java.util.Arrays.stream(normalize(query).split("[,;\\s]+"))
                .map(String::trim)
                .filter(token -> !token.isBlank())
                .collect(Collectors.toList());
    }

    private String normalize(String value) {
        String decomposed = Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD);
        return decomposed.replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replace('ç', 'c')
                .trim();
    }

    private String text(JsonNode node) {
        return node == null || node.isMissingNode() || node.isNull() ? null : node.asText();
    }

    private record Municipality(String name, String uf, String stateName) {
        private GeocodingResult toGeocodingResult() {
            String display = name + ", " + uf + ", Brasil";
            return new GeocodingResult(
                    display,
                    name,
                    null,
                    stateName,
                    "Brasil",
                    null,
                    null,
                    List.of()
            );
        }
    }
}
