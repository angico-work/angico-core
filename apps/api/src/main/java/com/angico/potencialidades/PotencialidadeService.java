package com.angico.potencialidades;

import com.angico.common.ClockProvider;
import com.angico.workspaces.WorkspaceAuthorizationService;
import com.angico.workspaces.WorkspaceReferenceValidator;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PotencialidadeService {

    private static final String STATUS_INICIAL = "ATIVA";

    private final PotencialidadeRepository potencialidadeRepository;
    private final PotencialidadeMemoryPublisher potencialidadeMemoryPublisher;
    private final ClockProvider clock;
    private final WorkspaceAuthorizationService authorizationService;
    private final WorkspaceReferenceValidator referenceValidator;

    public PotencialidadeService(
            PotencialidadeRepository potencialidadeRepository,
            PotencialidadeMemoryPublisher potencialidadeMemoryPublisher,
            ClockProvider clock,
            WorkspaceAuthorizationService authorizationService,
            WorkspaceReferenceValidator referenceValidator
    ) {
        this.potencialidadeRepository = potencialidadeRepository;
        this.potencialidadeMemoryPublisher = potencialidadeMemoryPublisher;
        this.clock = clock;
        this.authorizationService = authorizationService;
        this.referenceValidator = referenceValidator;
    }

    @Transactional
    public PotencialidadeResponse registrar(PotencialidadeCreateRequest request) {
        String workspaceId = authorizationService.requireWritableWorkspace(request.workspaceId());
        referenceValidator.requireTerritorio(request.territorioId(), workspaceId);
        PotencialidadeTerritorial potencialidade = new PotencialidadeTerritorial(
                workspaceId,
                request.territorioId(),
                request.categoria(),
                request.titulo(),
                request.descricao(),
                request.localizacao(),
                request.latitude(),
                request.longitude(),
                STATUS_INICIAL,
                authorizationService.currentActorId(),
                clock.now()
        );

        PotencialidadeTerritorial saved = potencialidadeRepository.save(potencialidade);
        potencialidadeMemoryPublisher.publicarRegistrada(saved);
        return PotencialidadeResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<PotencialidadeResponse> listar(String workspaceId) {
        String authorized = authorizationService.requireAuthorizedWorkspace(workspaceId);
        return potencialidadeRepository.findByWorkspaceIdOrderByCreatedAtDesc(authorized)
                .stream()
                .map(PotencialidadeResponse::from)
                .toList();
    }
}
