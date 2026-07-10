package com.angico.acoes;

import com.angico.common.ClockProvider;
import com.angico.workspaces.WorkspaceAuthorizationService;
import com.angico.workspaces.WorkspaceReferenceValidator;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AcaoService {

    private static final String STATUS_INICIAL = "EM_ANDAMENTO";

    private final AcaoRepository acaoRepository;
    private final AtribuicaoRepository atribuicaoRepository;
    private final AcaoMemoryPublisher acaoMemoryPublisher;
    private final ClockProvider clock;
    private final WorkspaceAuthorizationService authorizationService;
    private final WorkspaceReferenceValidator referenceValidator;

    public AcaoService(
            AcaoRepository acaoRepository,
            AtribuicaoRepository atribuicaoRepository,
            AcaoMemoryPublisher acaoMemoryPublisher,
            ClockProvider clock,
            WorkspaceAuthorizationService authorizationService,
            WorkspaceReferenceValidator referenceValidator
    ) {
        this.acaoRepository = acaoRepository;
        this.atribuicaoRepository = atribuicaoRepository;
        this.acaoMemoryPublisher = acaoMemoryPublisher;
        this.clock = clock;
        this.authorizationService = authorizationService;
        this.referenceValidator = referenceValidator;
    }

    /**
     * Registra uma ação e a inscreve na memória operacional (objeto + evento +
     * relações com missão e responsável). Persistência e memória commitam
     * juntas na mesma transação.
     */
    @Transactional
    public AcaoResponse registrar(AcaoCreateRequest request) {
        String workspaceId = authorizationService.requireAuthorizedWorkspace(request.workspaceId());
        referenceValidator.requireMissao(request.missaoId(), workspaceId);
        referenceValidator.requirePessoa(request.responsavelId(), workspaceId);
        Acao acao = new Acao(
                workspaceId,
                request.titulo(),
                request.descricao(),
                STATUS_INICIAL,
                request.missaoId(),
                request.responsavelId(),
                clock.now()
        );

        Acao saved = acaoRepository.save(acao);
        acaoMemoryPublisher.publicarIniciada(saved, authorizationService.currentActorId());
        return AcaoResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<AcaoResponse> listar(String workspaceId) {
        String authorized = authorizationService.requireAuthorizedWorkspace(workspaceId);
        return acaoRepository.findByWorkspaceIdOrderByCreatedAtDesc(authorized)
                .stream()
                .map(AcaoResponse::from)
                .toList();
    }
}
