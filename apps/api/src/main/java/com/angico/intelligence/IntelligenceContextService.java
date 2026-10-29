package com.angico.intelligence;

import com.angico.core.ontology.OntologyService;
import com.angico.workspaces.WorkspaceAuthorizationService;
import java.text.Normalizer;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** Bounded lexical retrieval. Shared words are candidate links, never proof of causation. */
@Service
public class IntelligenceContextService {
    private final JdbcTemplate jdbc;
    private final WorkspaceAuthorizationService authorization;
    private static final Map<String, String> TABLES = Map.of(
        OntologyService.OBSERVACAO, "observacao_territorial",
        OntologyService.PROBLEMA, "problema_socioambiental",
        OntologyService.ACAO, "acao", OntologyService.RESULTADO, "resultado");
    private static final Set<String> STOP = Set.of("para", "como", "pela", "pelo", "uma", "umas", "com", "sem", "dos", "das", "que", "por", "nao", "foi", "tem", "esta");

    public IntelligenceContextService(JdbcTemplate jdbc, WorkspaceAuthorizationService authorization) {
        this.jdbc = jdbc;
        this.authorization = authorization;
    }

    public List<IntelligenceSource> retrieve(String workspace, String text) {
        authorization.requireMember(workspace);
        var terms = tokens(text);
        if (terms.isEmpty()) return List.of();
        var candidates = new ArrayList<IntelligenceSource>();
        TABLES.forEach((type, table) -> {
            String date = Set.of("OBSERVACAO", "RESULTADO").contains(type) ? "coalesce(occurred_at, created_at)" : "created_at";
            // Table identifiers come exclusively from the static allowlist. No messages, people or attachments.
            candidates.addAll(jdbc.query("select id,titulo,descricao," + date + " as occurred_at from " + table
                + " where workspace_id = ? order by created_at desc, id desc limit 50", (row, n) -> {
                    String title = safeText(row.getString("titulo"), 255);
                    String excerpt = safeText(title + "\n" + Objects.toString(row.getString("descricao"), ""), 1000);
                    String id = row.getString("id");
                    return new IntelligenceSource(type + ":" + id, type, id, title, excerpt, row.getTimestamp("occurred_at").toInstant());
                }, workspace));
        });
        return candidates.stream().filter(s -> relevance(terms, s.excerpt()) > 0)
            .sorted(Comparator.<IntelligenceSource>comparingInt(s -> relevance(terms, s.excerpt())).reversed()
                .thenComparing(IntelligenceSource::occurredAt, Comparator.reverseOrder()).thenComparing(IntelligenceSource::sourceId))
            .limit(20).toList();
    }

    static Set<String> tokens(String value) {
        String normalized = Normalizer.normalize(Objects.toString(value, "").toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "");
        var terms = new HashSet<String>();
        for (String term : normalized.split("[^a-z0-9]+")) if (term.length() >= 3 && !STOP.contains(term)) terms.add(term);
        return terms;
    }

    static int relevance(Set<String> terms, String text) {
        var words = tokens(text);
        return (int) terms.stream().filter(words::contains).count();
    }

    static String safeText(String value, int limit) {
        String clean = Objects.toString(value, "")
            .replaceAll("(?i)[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}", "[contato removido]")
            .replaceAll("(?<!\\d)(?:\\+?\\d[ ()-]*){9,15}(?!\\d)", "[contato removido]");
        return clean.substring(0, Math.min(limit, clean.length()));
    }
}
