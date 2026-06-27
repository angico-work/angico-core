package com.angico.problemas;

import com.angico.core.memory.MemoryGateway;
import org.springframework.stereotype.Component;

@Component
public class ProblemaMemoryPublisher {

    private final MemoryGateway memoryGateway;

    public ProblemaMemoryPublisher(MemoryGateway memoryGateway) {
        this.memoryGateway = memoryGateway;
    }
}
