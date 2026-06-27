package com.angico.observacoes;

import org.springframework.stereotype.Service;

@Service
public class ObservacaoService {

    private final ObservacaoRepository observacaoRepository;
    private final ObservacaoMemoryPublisher observacaoMemoryPublisher;

    public ObservacaoService(ObservacaoRepository observacaoRepository, ObservacaoMemoryPublisher observacaoMemoryPublisher) {
        this.observacaoRepository = observacaoRepository;
        this.observacaoMemoryPublisher = observacaoMemoryPublisher;
    }
}
