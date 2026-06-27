package com.angico.problemas;

import org.springframework.stereotype.Service;

@Service
public class ProblemaService {

    private final ProblemaRepository problemaRepository;
    private final ProblemaMemoryPublisher problemaMemoryPublisher;

    public ProblemaService(ProblemaRepository problemaRepository, ProblemaMemoryPublisher problemaMemoryPublisher) {
        this.problemaRepository = problemaRepository;
        this.problemaMemoryPublisher = problemaMemoryPublisher;
    }
}
