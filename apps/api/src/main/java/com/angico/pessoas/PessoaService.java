package com.angico.pessoas;

import com.angico.common.ClockProvider;
import com.angico.common.CurrentActorProvider;
import com.angico.common.UnauthorizedException;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PessoaService {

    private static final String PAPEL_PADRAO = "Jovem Mapeador";

    private final PessoaRepository pessoaRepository;
    private final PessoaMemoryPublisher pessoaMemoryPublisher;
    private final ClockProvider clock;
    private final CurrentActorProvider currentActorProvider;

    public PessoaService(
            PessoaRepository pessoaRepository,
            PessoaMemoryPublisher pessoaMemoryPublisher,
            ClockProvider clock,
            CurrentActorProvider currentActorProvider
    ) {
        this.pessoaRepository = pessoaRepository;
        this.pessoaMemoryPublisher = pessoaMemoryPublisher;
        this.clock = clock;
        this.currentActorProvider = currentActorProvider;
    }

    /**
     * Registra uma pessoa e a inscreve na memória do território (objeto +
     * evento). Persistência e memória commitam juntas na mesma transação.
     */
    @Transactional
    public PessoaResponse registrar(PessoaRequest request) {
        String angicoId = safeNormalize(request.angicoId());
        // Link to the real identity: if this Angico ID is already part of the
        // território, reuse that person instead of creating a duplicate.
        if (angicoId != null) {
            var existing = pessoaRepository
                    .findByWorkspaceIdAndAngicoIdIgnoreCase(request.workspaceId(), angicoId);
            if (existing.isPresent()) {
                return PessoaResponse.from(existing.get());
            }
        }

        Pessoa pessoa = new Pessoa(
                request.workspaceId(),
                request.nome(),
                request.papel() == null || request.papel().isBlank()
                        ? PAPEL_PADRAO : request.papel(),
                clock.now()
        );
        pessoa.setAngicoId(angicoId);

        Pessoa saved = pessoaRepository.save(pessoa);
        pessoaMemoryPublisher.publicarEngajada(saved);
        return PessoaResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<PessoaResponse> listar(String workspaceId) {
        return pessoaRepository.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId)
                .stream()
                .map(PessoaResponse::from)
                .toList();
    }

    /** Powers the Angico-ID autocomplete on the "Nova pessoa" form. */
    @Transactional(readOnly = true)
    public List<PessoaResponse> search(String workspaceId, String q) {
        if (q == null || q.trim().length() < 2) {
            return List.of();
        }
        return pessoaRepository.searchInWorkspace(workspaceId, q.trim())
                .stream()
                .map(PessoaResponse::from)
                .toList();
    }

    /** Updates the current pessoa's editable profile fields (nome, telefone, foto). */
    @Transactional
    public PessoaResponse updateCurrent(PessoaUpdateRequest request) {
        Long pessoaId = currentActorProvider.currentPessoaId()
                .orElseThrow(() -> new UnauthorizedException("Sessao invalida."));
        Pessoa pessoa = pessoaRepository.findById(pessoaId)
                .orElseThrow(() -> new UnauthorizedException("Sessao invalida."));
        if (request.nome() != null && !request.nome().isBlank()) {
            pessoa.setNome(request.nome().trim());
        }
        if (request.telefone() != null) {
            pessoa.setTelefone(request.telefone().isBlank() ? null : request.telefone().trim());
        }
        if (request.foto() != null) {
            pessoa.setFoto(request.foto().isBlank() ? null : request.foto());
        }
        return PessoaResponse.from(pessoaRepository.save(pessoa));
    }

    // Tolerant normalization: a malformed handle should never block adding a
    // person — we simply drop the link rather than failing the whole request.
    private String safeNormalize(String rawAngicoId) {
        try {
            return AngicoIdNormalizer.normalizeOptional(rawAngicoId);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }
}
