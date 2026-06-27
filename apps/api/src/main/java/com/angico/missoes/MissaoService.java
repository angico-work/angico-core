package com.angico.missoes;

import com.angico.common.ClockProvider;
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

    public MissaoService(
            MissaoRepository missaoRepository,
            MissaoMemoryPublisher missaoMemoryPublisher,
            ClockProvider clock
    ) {
        this.missaoRepository = missaoRepository;
        this.missaoMemoryPublisher = missaoMemoryPublisher;
        this.clock = clock;
    }

    /**
     * Registra uma missão e a inscreve na memória do território (objeto +
     * evento + relações com problema/responsável). Persistência e memória
     * commitam juntas na mesma transação.
     */
    @Transactional
    public MissaoResponse registrar(MissaoRequest request) {
        Missao missao = new Missao(
                request.workspaceId(),
                request.titulo(),
                request.descricao(),
                STATUS_INICIAL,
                PROGRESSO_INICIAL,
                request.problemaId(),
                request.responsavelId(),
                clock.now()
        );

        Missao saved = missaoRepository.save(missao);
        missaoMemoryPublisher.publicarCriada(saved);
        return MissaoResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<MissaoResponse> listar(String workspaceId) {
        return missaoRepository.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId)
                .stream()
                .map(MissaoResponse::from)
                .toList();
    }
}
