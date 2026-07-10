package com.angico.observacoes;

import com.angico.common.ClockProvider;
import com.angico.workspaces.WorkspaceAuthorizationService;
import com.angico.workspaces.WorkspaceReferenceValidator;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ObservacaoService {

    private static final String STATUS_INICIAL = "ABERTA";
    private static final String URGENCIA_PADRAO = "MEDIA";

    private final ObservacaoRepository observacaoRepository;
    private final ObservacaoMemoryPublisher observacaoMemoryPublisher;
    private final ClockProvider clock;
    private final WorkspaceAuthorizationService authorizationService;
    private final WorkspaceReferenceValidator referenceValidator;

    public ObservacaoService(
            ObservacaoRepository observacaoRepository,
            ObservacaoMemoryPublisher observacaoMemoryPublisher,
            ClockProvider clock,
            WorkspaceAuthorizationService authorizationService,
            WorkspaceReferenceValidator referenceValidator
    ) {
        this.observacaoRepository = observacaoRepository;
        this.observacaoMemoryPublisher = observacaoMemoryPublisher;
        this.clock = clock;
        this.authorizationService = authorizationService;
        this.referenceValidator = referenceValidator;
    }

    /**
     * Registra uma observação e a inscreve na memória do território (objeto +
     * evento + relação com o território). Persistência e memória commitam
     * juntas na mesma transação.
     */
    @Transactional
    public ObservacaoResponse registrar(ObservacaoCreateRequest request) {
        String workspaceId = authorizationService.requireAuthorizedWorkspace(request.workspaceId());
        referenceValidator.requireTerritorio(request.territorioId(), workspaceId);
        ObservacaoTerritorial observacao = new ObservacaoTerritorial(
                workspaceId,
                request.territorioId(),
                request.categoria(),
                request.titulo(),
                request.descricao(),
                request.localizacao(),
                request.latitude(),
                request.longitude(),
                request.urgencia() == null || request.urgencia().isBlank()
                        ? URGENCIA_PADRAO : request.urgencia(),
                STATUS_INICIAL,
                authorizationService.currentActorId(),
                clock.now()
        );

        observacao.setBairro(request.bairro());
        observacao.setCidade(request.cidade());
        observacao.setEstado(request.estado());

        ObservacaoTerritorial saved = observacaoRepository.save(observacao);
        observacaoMemoryPublisher.publicarRegistrada(saved);
        return ObservacaoResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<ObservacaoResponse> listar(String workspaceId) {
        String authorized = authorizationService.requireAuthorizedWorkspace(workspaceId);
        return observacaoRepository.findByWorkspaceIdOrderByCreatedAtDesc(authorized)
                .stream()
                .map(ObservacaoResponse::from)
                .toList();
    }
}
