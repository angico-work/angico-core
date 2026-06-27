package com.angico.missoes;

import org.springframework.stereotype.Service;

@Service
public class MissaoWorkflowService {

    private final MissaoRepository missaoRepository;

    public MissaoWorkflowService(MissaoRepository missaoRepository) {
        this.missaoRepository = missaoRepository;
    }
}
