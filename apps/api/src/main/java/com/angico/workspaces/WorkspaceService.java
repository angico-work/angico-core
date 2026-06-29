package com.angico.workspaces;

import com.angico.common.ClockProvider;
import java.text.Normalizer;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WorkspaceService {

    // The workspace the web app ships with — seeded so the switcher is never
    // empty and the existing território's data keeps a readable name.
    private static final String DEFAULT_SLUG = "coletivo-jardim-novo";
    private static final String DEFAULT_NOME = "Coletivo Jardim Novo";

    private final WorkspaceRepository workspaceRepository;
    private final ClockProvider clock;

    public WorkspaceService(WorkspaceRepository workspaceRepository, ClockProvider clock) {
        this.workspaceRepository = workspaceRepository;
        this.clock = clock;
    }

    @Transactional
    public List<WorkspaceResponse> listar() {
        ensureDefault();
        return workspaceRepository.findAllByOrderByCreatedAtAsc()
                .stream()
                .map(WorkspaceResponse::from)
                .toList();
    }

    @Transactional
    public WorkspaceResponse criar(WorkspaceCreateRequest request) {
        String nome = request.nome().trim();
        String slug = uniqueSlug(slugify(nome));
        Workspace saved = workspaceRepository.save(
                new Workspace(slug, nome, blankToNull(request.criadoPor()), clock.now()));
        return WorkspaceResponse.from(saved);
    }

    /**
     * Removes a workspace from the registry. The shipped home workspace is
     * protected. Scoped data (observações, etc.) is left intact — re-creating a
     * workspace with the same name yields the same slug and restores its view.
     */
    @Transactional
    public void remover(String slug) {
        if (DEFAULT_SLUG.equals(slug)) {
            // ApiExceptionHandler maps IllegalArgumentException -> HTTP 400.
            throw new IllegalArgumentException("O workspace inicial não pode ser removido.");
        }
        workspaceRepository.findBySlug(slug).ifPresent(workspaceRepository::delete);
    }

    /** Guarantees the shipped workspace exists so the list is never empty. */
    private void ensureDefault() {
        if (!workspaceRepository.existsBySlug(DEFAULT_SLUG)) {
            workspaceRepository.save(new Workspace(DEFAULT_SLUG, DEFAULT_NOME, null, clock.now()));
        }
    }

    /** Appends -2, -3, … until the slug is free, so names can repeat safely. */
    private String uniqueSlug(String base) {
        String root = base.isBlank() ? "workspace" : base;
        String candidate = root;
        int suffix = 2;
        while (workspaceRepository.existsBySlug(candidate)) {
            candidate = root + "-" + suffix++;
        }
        return candidate;
    }

    // "Horta Comunitária 2" -> "horta-comunitaria-2": accent-folded, lowercased,
    // every run of non-alphanumerics collapsed to a single hyphen.
    static String slugify(String input) {
        String folded = Normalizer.normalize(input, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return folded.toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-+|-+$)", "");
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
