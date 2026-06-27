package com.angico.evidencias;

import com.angico.core.memory.MemoryGateway;
import org.springframework.stereotype.Component;

@Component
public class EvidenciaMemoryPublisher {

    private final MemoryGateway memoryGateway;

    public EvidenciaMemoryPublisher(MemoryGateway memoryGateway) {
        this.memoryGateway = memoryGateway;
    }
}
