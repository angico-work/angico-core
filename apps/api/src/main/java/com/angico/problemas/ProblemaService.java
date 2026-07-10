package com.angico.problemas;

import com.angico.common.ClockProvider;
import com.angico.workspaces.WorkspaceAuthorizationService;
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

    public ProblemaService(
            ProblemaRepository problemaRepository,
            ProblemaMemoryPublisher problemaMemoryPublisher,
            ClockProvider clock,
            WorkspaceAuthorizationService authorizationService
    ) {
        this.problemaRepository = problemaRepository;
        this.problemaMemoryPublisher = problemaMemoryPublisher;
        this.clock = clock;
        this.authorizationService = authorizationService;
    }

    /**
     * Registra um problema socioambiental e o inscreve na memória do território
     * (objeto + evento + eventual relação com a observação de origem).
     * Persistência e memória commitam juntas na mesma transação.
     */
    @Transactional
    public ProblemaResponse registrar(ProblemaRequest request) {
        String workspaceId = authorizationService.requireAuthorizedWorkspace(request.workspaceId());
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
                request.autorId(),
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
