package com.angico.problemas;

import com.angico.common.ClockProvider;
import com.angico.workspaces.WorkspaceAuthorizationService;
import com.angico.workspaces.WorkspaceReferenceValidator;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProblemaService {

    private static final String STATUS_INICIAL = "ABERTO";
    private static final String SEVERIDADE_PADRAO = "MEDIA";

    private final ProblemaRepository problemaRepository;
    private final ProblemaMemoryPublisher problemaMemoryPublisher;
    private final ClockProvider clock;
    private final WorkspaceAuthorizationService authorizationService;
    private final WorkspaceReferenceValidator referenceValidator;

    public ProblemaService(
            ProblemaRepository problemaRepository,
            ProblemaMemoryPublisher problemaMemoryPublisher,
            ClockProvider clock,
            WorkspaceAuthorizationService authorizationService,
            WorkspaceReferenceValidator referenceValidator
    ) {
        this.problemaRepository = problemaRepository;
        this.problemaMemoryPublisher = problemaMemoryPublisher;
        this.clock = clock;
        this.authorizationService = authorizationService;
        this.referenceValidator = referenceValidator;
    }

    @Transactional
    public ProblemaResponse registrar(ProblemaRequest request) {
        String workspaceId = authorizationService.requireWritableWorkspace(request.workspaceId());
        referenceValidator.requireTerritorio(request.territorioId(), workspaceId);
        referenceValidator.requireObservacao(request.origemObservacaoId(), workspaceId);
        ProblemaSocioambiental problema = new ProblemaSocioambiental(
                workspaceId,
                request.territorioId(),
                request.categoria(),
                request.titulo(),
                request.descricao(),
                request.localizacao(),
                request.latitude(),
                request.longitude(),
                request.severidade() == null || request.severidade().isBlank()
                        ? SEVERIDADE_PADRAO : request.severidade(),
                STATUS_INICIAL,
                request.origemObservacaoId(),
                authorizationService.currentActorId(),
                clock.now()
        );

        ProblemaSocioambiental saved = problemaRepository.save(problema);
        problemaMemoryPublisher.publicarRegistrado(saved);
        return ProblemaResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<ProblemaResponse> listar(String workspaceId) {
        String authorized = authorizationService.requireAuthorizedWorkspace(workspaceId);
        return problemaRepository.findByWorkspaceIdOrderByCreatedAtDesc(authorized)
                .stream()
                .map(ProblemaResponse::from)
                .toList();
    }
}
