package com.angico.acoes;

import com.angico.core.memory.MemoryGateway;
import org.springframework.stereotype.Component;

@Component
public class AcaoMemoryPublisher {

    private final MemoryGateway memoryGateway;

    public AcaoMemoryPublisher(MemoryGateway memoryGateway) {
        this.memoryGateway = memoryGateway;
    }
}
