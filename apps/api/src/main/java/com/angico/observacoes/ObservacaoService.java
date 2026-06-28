package com.angico.observacoes;

import com.angico.common.ClockProvider;
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

    public ObservacaoService(
            ObservacaoRepository observacaoRepository,
            ObservacaoMemoryPublisher observacaoMemoryPublisher,
            ClockProvider clock
    ) {
        this.observacaoRepository = observacaoRepository;
        this.observacaoMemoryPublisher = observacaoMemoryPublisher;
        this.clock = clock;
    }

    /**
     * Registra uma observação e a inscreve na memória do território (objeto +
     * evento + relação com o território). Persistência e memória commitam
     * juntas na mesma transação.
     */
    @Transactional
    public ObservacaoResponse registrar(ObservacaoCreateRequest request) {
        ObservacaoTerritorial observacao = new ObservacaoTerritorial(
                request.workspaceId(),
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
                request.autorId(),
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
        return observacaoRepository.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId)
                .stream()
                .map(ObservacaoResponse::from)
                .toList();
    }
}
