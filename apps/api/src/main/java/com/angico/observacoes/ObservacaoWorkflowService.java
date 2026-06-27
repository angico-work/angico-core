package com.angico.observacoes;

import org.springframework.stereotype.Service;

@Service
public class ObservacaoWorkflowService {

    private final ObservacaoRepository observacaoRepository;

    public ObservacaoWorkflowService(ObservacaoRepository observacaoRepository) {
        this.observacaoRepository = observacaoRepository;
    }
}
