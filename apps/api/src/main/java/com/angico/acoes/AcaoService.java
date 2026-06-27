package com.angico.acoes;

import org.springframework.stereotype.Service;

@Service
public class AcaoService {

    private final AcaoRepository acaoRepository;
    private final AtribuicaoRepository atribuicaoRepository;
    private final AcaoMemoryPublisher acaoMemoryPublisher;

    public AcaoService(AcaoRepository acaoRepository, AtribuicaoRepository atribuicaoRepository, AcaoMemoryPublisher acaoMemoryPublisher) {
        this.acaoRepository = acaoRepository;
        this.atribuicaoRepository = atribuicaoRepository;
        this.acaoMemoryPublisher = acaoMemoryPublisher;
    }
}
