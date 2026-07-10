package com.angico.missoes;

import com.angico.common.ClockProvider;
import com.angico.workspaces.WorkspaceAuthorizationService;
import com.angico.workspaces.WorkspaceReferenceValidator;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MissaoService {

    private static final String STATUS_INICIAL = "PLANEJADA";
    private static final int PROGRESSO_INICIAL = 0;

    private final MissaoRepository missaoRepository;
    private final MissaoMemoryPublisher missaoMemoryPublisher;
    private final ClockProvider clock;
    private final WorkspaceAuthorizationService authorizationService;
    private final WorkspaceReferenceValidator referenceValidator;

    public MissaoService(
            MissaoRepository missaoRepository,
            MissaoMemoryPublisher missaoMemoryPublisher,
            ClockProvider clock,
            WorkspaceAuthorizationService authorizationService,
            WorkspaceReferenceValidator referenceValidator
    ) {
        this.missaoRepository = missaoRepository;
        this.missaoMemoryPublisher = missaoMemoryPublisher;
        this.clock = clock;
        this.authorizationService = authorizationService;
        this.referenceValidator = referenceValidator;
    }

    @Transactional
    public MissaoResponse registrar(MissaoRequest request) {
        String workspaceId = authorizationService.requireAuthorizedWorkspace(request.workspaceId());
        referenceValidator.requireTerritorio(request.territorioId(), workspaceId);
        referenceValidator.requireProblema(request.problemaId(), workspaceId);
        referenceValidator.requirePessoa(request.responsavelId(), workspaceId);
        Missao missao = new Missao(
                workspaceId,
                request.titulo(),
                request.descricao(),
                STATUS_INICIAL,
                PROGRESSO_INICIAL,
                request.territorioId(),
                request.problemaId(),
                request.responsavelId(),
                clock.now()
        );

        Missao saved = missaoRepository.save(missao);
        missaoMemoryPublisher.publicarCriada(saved, authorizationService.currentActorId());
        return MissaoResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<MissaoResponse> listar(String workspaceId) {
        String authorized = authorizationService.requireAuthorizedWorkspace(workspaceId);
        return missaoRepository.findByWorkspaceIdOrderByCreatedAtDesc(authorized)
                .stream()
                .map(MissaoResponse::from)
                .toList();
    }
}
