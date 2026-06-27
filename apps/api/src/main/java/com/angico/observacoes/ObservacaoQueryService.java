package com.angico.observacoes;

import org.springframework.stereotype.Service;

@Service
public class ObservacaoQueryService {

    private final ObservacaoRepository observacaoRepository;

    public ObservacaoQueryService(ObservacaoRepository observacaoRepository) {
        this.observacaoRepository = observacaoRepository;
    }
}
