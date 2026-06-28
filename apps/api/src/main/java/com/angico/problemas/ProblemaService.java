package com.angico.problemas;

import com.angico.common.ClockProvider;
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

    public ProblemaService(
            ProblemaRepository problemaRepository,
            ProblemaMemoryPublisher problemaMemoryPublisher,
            ClockProvider clock
    ) {
        this.problemaRepository = problemaRepository;
        this.problemaMemoryPublisher = problemaMemoryPublisher;
        this.clock = clock;
    }

    /**
     * Registra um problema socioambiental e o inscreve na memória do território
     * (objeto + evento + eventual relação com a observação de origem).
     * Persistência e memória commitam juntas na mesma transação.
     */
    @Transactional
    public ProblemaResponse registrar(ProblemaRequest request) {
        ProblemaSocioambiental problema = new ProblemaSocioambiental(
                request.workspaceId(),
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
        return problemaRepository.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId)
                .stream()
                .map(ProblemaResponse::from)
                .toList();
    }
}
