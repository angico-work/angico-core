package com.angico.acoes;

import com.angico.common.ClockProvider;
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

    public AcaoService(
            AcaoRepository acaoRepository,
            AtribuicaoRepository atribuicaoRepository,
            AcaoMemoryPublisher acaoMemoryPublisher,
            ClockProvider clock
    ) {
        this.acaoRepository = acaoRepository;
        this.atribuicaoRepository = atribuicaoRepository;
        this.acaoMemoryPublisher = acaoMemoryPublisher;
        this.clock = clock;
    }

    /**
     * Registra uma ação e a inscreve na memória operacional (objeto + evento +
     * relações com missão e responsável). Persistência e memória commitam
     * juntas na mesma transação.
     */
    @Transactional
    public AcaoResponse registrar(AcaoCreateRequest request) {
        Acao acao = new Acao(
                request.workspaceId(),
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
        return acaoRepository.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId)
                .stream()
                .map(AcaoResponse::from)
                .toList();
    }
}
