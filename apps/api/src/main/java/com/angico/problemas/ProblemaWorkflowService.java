package com.angico.problemas;

import org.springframework.stereotype.Service;

@Service
public class ProblemaWorkflowService {

    private final ProblemaRepository problemaRepository;

    public ProblemaWorkflowService(ProblemaRepository problemaRepository) {
        this.problemaRepository = problemaRepository;
    }
}
