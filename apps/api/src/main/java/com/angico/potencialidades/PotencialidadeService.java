package com.angico.potencialidades;

import com.angico.common.ClockProvider;
import com.angico.workspaces.WorkspaceAuthorizationService;
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

    public PotencialidadeService(
            PotencialidadeRepository potencialidadeRepository,
            PotencialidadeMemoryPublisher potencialidadeMemoryPublisher,
            ClockProvider clock,
            WorkspaceAuthorizationService authorizationService
    ) {
        this.potencialidadeRepository = potencialidadeRepository;
        this.potencialidadeMemoryPublisher = potencialidadeMemoryPublisher;
        this.clock = clock;
        this.authorizationService = authorizationService;
    }

    /**
     * Registra uma potencialidade e a inscreve na memória do território (objeto +
     * evento + relação com o território). Persistência e memória commitam
     * juntas na mesma transação.
     */
    @Transactional
    public PotencialidadeResponse registrar(PotencialidadeCreateRequest request) {
        String workspaceId = authorizationService.requireAuthorizedWorkspace(request.workspaceId());
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
                request.autorId(),
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
