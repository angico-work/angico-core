package com.angico.pessoas;

<<<<<<< HEAD
import com.angico.common.ClockProvider;
import java.util.List;
=======
import java.util.List;
import java.util.Locale;

import com.angico.common.CurrentActorProvider;
import com.angico.common.UnauthorizedException;
>>>>>>> origin
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PessoaService {

<<<<<<< HEAD
    private static final String PAPEL_PADRAO = "Jovem Mapeador";

    private final PessoaRepository pessoaRepository;
    private final PessoaMemoryPublisher pessoaMemoryPublisher;
    private final ClockProvider clock;

    public PessoaService(
            PessoaRepository pessoaRepository,
            PessoaMemoryPublisher pessoaMemoryPublisher,
            ClockProvider clock
    ) {
        this.pessoaRepository = pessoaRepository;
        this.pessoaMemoryPublisher = pessoaMemoryPublisher;
        this.clock = clock;
    }

    /**
     * Registra uma pessoa e a inscreve na memória do território (objeto +
     * evento). Persistência e memória commitam juntas na mesma transação.
     */
    @Transactional
    public PessoaResponse registrar(PessoaRequest request) {
        Pessoa pessoa = new Pessoa(
                request.workspaceId(),
                request.nome(),
                request.papel() == null || request.papel().isBlank()
                        ? PAPEL_PADRAO : request.papel(),
                clock.now()
        );

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
=======
    private final PessoaRepository pessoaRepository;
    private final CurrentActorProvider currentActorProvider;

    public PessoaService(PessoaRepository pessoaRepository, CurrentActorProvider currentActorProvider) {
        this.pessoaRepository = pessoaRepository;
        this.currentActorProvider = currentActorProvider;
    }

    public List<PessoaResponse> list(String workspaceId) {
        String actorWorkspace = currentActorProvider.currentWorkspaceId()
                .orElseThrow(() -> new UnauthorizedException("Sessao invalida."));
        String selectedWorkspace = workspaceId == null || workspaceId.isBlank()
                ? actorWorkspace
                : workspaceId.trim();
        if (!actorWorkspace.equals(selectedWorkspace)) {
            throw new UnauthorizedException("Acesso negado ao workspace informado.");
        }
        return pessoaRepository.findByWorkspaceIdOrderByNomeAsc(selectedWorkspace)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<PessoaResponse> search(String workspaceId, String query) {
        String actorWorkspace = authorizedWorkspace(workspaceId);
        String normalizedQuery = normalizeSearch(query);
        if (normalizedQuery.isBlank()) {
            return List.of();
        }
        return pessoaRepository.searchByIdentity(actorWorkspace, normalizedQuery)
                .stream()
                .limit(12)
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public PessoaResponse updateMyAngicoId(AngicoIdRequest request) {
        Long actorId = currentActorProvider.currentPessoaId()
                .orElseThrow(() -> new UnauthorizedException("Sessao invalida."));
        Pessoa pessoa = pessoaRepository.findById(actorId)
                .orElseThrow(() -> new UnauthorizedException("Sessao invalida."));
        String angicoId = AngicoIdNormalizer.normalize(request.angicoId());
        pessoaRepository.findByAngicoIdIgnoreCase(angicoId)
                .filter(existing -> !existing.getId().equals(pessoa.getId()))
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("Angico ID ja esta em uso.");
                });
        pessoa.setAngicoId(angicoId);
        return toResponse(pessoaRepository.save(pessoa));
    }

    private String authorizedWorkspace(String workspaceId) {
        String actorWorkspace = currentActorProvider.currentWorkspaceId()
                .orElseThrow(() -> new UnauthorizedException("Sessao invalida."));
        String selectedWorkspace = workspaceId == null || workspaceId.isBlank()
                ? actorWorkspace
                : workspaceId.trim();
        if (!actorWorkspace.equals(selectedWorkspace)) {
            throw new UnauthorizedException("Acesso negado ao workspace informado.");
        }
        return selectedWorkspace;
    }

    private String normalizeSearch(String query) {
        if (query == null) {
            return "";
        }
        return query.trim().replaceFirst("^@", "").toLowerCase(Locale.ROOT);
    }

    public PessoaResponse toResponse(Pessoa pessoa) {
        return new PessoaResponse(
                pessoa.getId(),
                pessoa.getWorkspaceId(),
                pessoa.getNome(),
                pessoa.getPapel(),
                pessoa.getEmail(),
                pessoa.getAngicoId(),
                pessoa.getStatus()
        );
>>>>>>> origin
    }
}
