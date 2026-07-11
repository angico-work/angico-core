package com.angico.pessoas;

import com.angico.common.ClockProvider;
import com.angico.common.CurrentActorProvider;
import com.angico.common.UnauthorizedException;
import com.angico.workspaces.WorkspaceAuthorizationService;
import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PessoaService {

    private static final String PAPEL_PADRAO = "Jovem Mapeador";

    private final PessoaRepository pessoaRepository;
    private final PessoaMemoryPublisher pessoaMemoryPublisher;
    private final ClockProvider clock;
    private final CurrentActorProvider currentActorProvider;
    private final WorkspaceAuthorizationService authorizationService;

    public PessoaService(
            PessoaRepository pessoaRepository,
            PessoaMemoryPublisher pessoaMemoryPublisher,
            ClockProvider clock,
            CurrentActorProvider currentActorProvider,
            WorkspaceAuthorizationService authorizationService
    ) {
        this.pessoaRepository = pessoaRepository;
        this.pessoaMemoryPublisher = pessoaMemoryPublisher;
        this.clock = clock;
        this.currentActorProvider = currentActorProvider;
        this.authorizationService = authorizationService;
    }

    @Transactional
    public PessoaResponse registrar(PessoaRequest request) {
        String workspaceId = authorizationService.requireWritableWorkspace(request.workspaceId());
        String angicoId = safeNormalize(request.angicoId());
        if (angicoId != null) {
            var existing = pessoaRepository
                    .findByWorkspaceIdAndAngicoIdIgnoreCase(workspaceId, angicoId);
            if (existing.isPresent()) {
                return PessoaResponse.from(existing.get());
            }
            pessoaRepository.findByAngicoIdIgnoreCase(angicoId).ifPresent(person -> {
                throw new IllegalArgumentException(
                        "Angico ID já está associado a uma pessoa de outro workspace.");
            });
        }

        Pessoa pessoa = new Pessoa(
                workspaceId,
                request.nome(),
                request.papel() == null || request.papel().isBlank()
                        ? PAPEL_PADRAO : request.papel(),
                clock.now()
        );
        pessoa.setAngicoId(angicoId);

        Pessoa saved;
        try {
            saved = pessoaRepository.saveAndFlush(pessoa);
        } catch (DataIntegrityViolationException exception) {
            throw new IllegalArgumentException("Angico ID já está associado a outra pessoa.");
        }
        pessoaMemoryPublisher.publicarEngajada(saved, authorizationService.currentActorId());
        return PessoaResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<PessoaResponse> listar(String workspaceId) {
        String authorized = authorizationService.requireAuthorizedWorkspace(workspaceId);
        return pessoaRepository.findByWorkspaceIdOrderByCreatedAtDesc(authorized)
                .stream()
                .map(PessoaResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PessoaResponse> search(String workspaceId, String q) {
        String authorized = authorizationService.requireAuthorizedWorkspace(workspaceId);
        if (q == null || q.trim().length() < 2) {
            return List.of();
        }
        return pessoaRepository.searchInWorkspace(authorized, q.trim())
                .stream()
                .map(PessoaResponse::from)
                .toList();
    }

    @Transactional
    public PessoaResponse updateCurrent(PessoaUpdateRequest request) {
        Long pessoaId = currentActorProvider.currentPessoaId()
                .orElseThrow(() -> new UnauthorizedException("Sessao invalida."));
        Pessoa pessoa = pessoaRepository.findById(pessoaId)
                .orElseThrow(() -> new UnauthorizedException("Sessao invalida."));
        List<String> workspaceIds = authorizationService.authorizedWorkspaceIds();
        String actorId = authorizationService.currentActorId();
        if (request.nome() != null && !request.nome().isBlank()) {
            pessoa.setNome(request.nome().trim());
        }
        if (request.telefone() != null) {
            pessoa.setTelefone(request.telefone().isBlank() ? null : request.telefone().trim());
        }
        if (request.foto() != null) {
            pessoa.setFoto(request.foto().isBlank() ? null : request.foto());
        }
        Pessoa saved = pessoaRepository.save(pessoa);
        workspaceIds.forEach(workspaceId ->
                pessoaMemoryPublisher.publicarAtualizada(saved, workspaceId, actorId));
        return PessoaResponse.from(saved);
    }

    private String safeNormalize(String rawAngicoId) {
        return AngicoIdNormalizer.normalizeOptional(rawAngicoId);
    }
}
