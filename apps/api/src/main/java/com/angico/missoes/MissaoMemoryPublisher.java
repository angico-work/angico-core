package com.angico.missoes;

import com.angico.core.memory.MemoryGateway;
import org.springframework.stereotype.Component;

@Component
public class MissaoMemoryPublisher {

    private final MemoryGateway memoryGateway;

    public MissaoMemoryPublisher(MemoryGateway memoryGateway) {
        this.memoryGateway = memoryGateway;
    }
}
