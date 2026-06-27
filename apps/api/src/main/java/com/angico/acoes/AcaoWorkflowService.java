package com.angico.acoes;

import org.springframework.stereotype.Service;

@Service
public class AcaoWorkflowService {

    private final AcaoRepository acaoRepository;

    public AcaoWorkflowService(AcaoRepository acaoRepository) {
        this.acaoRepository = acaoRepository;
    }
}
