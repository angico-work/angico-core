package com.angico.missoes;

import org.springframework.stereotype.Service;

@Service
public class MissaoService {

    private final MissaoRepository missaoRepository;
    private final MissaoMemoryPublisher missaoMemoryPublisher;

    public MissaoService(MissaoRepository missaoRepository, MissaoMemoryPublisher missaoMemoryPublisher) {
        this.missaoRepository = missaoRepository;
        this.missaoMemoryPublisher = missaoMemoryPublisher;
    }
}
