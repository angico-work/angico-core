package com.angico.acoes;

import com.angico.common.ClockProvider;
import com.angico.workspaces.WorkspaceAuthorizationService;
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

    public AcaoService(
            AcaoRepository acaoRepository,
            AtribuicaoRepository atribuicaoRepository,
            AcaoMemoryPublisher acaoMemoryPublisher,
            ClockProvider clock,
            WorkspaceAuthorizationService authorizationService
    ) {
        this.acaoRepository = acaoRepository;
        this.atribuicaoRepository = atribuicaoRepository;
        this.acaoMemoryPublisher = acaoMemoryPublisher;
        this.clock = clock;
        this.authorizationService = authorizationService;
    }

    /**
     * Registra uma ação e a inscreve na memória operacional (objeto + evento +
     * relações com missão e responsável). Persistência e memória commitam
     * juntas na mesma transação.
     */
    @Transactional
    public AcaoResponse registrar(AcaoCreateRequest request) {
        String workspaceId = authorizationService.requireAuthorizedWorkspace(request.workspaceId());
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
        acaoMemoryPublisher.publicarIniciada(saved);
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
