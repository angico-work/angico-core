package com.angico.impacto;

import com.angico.core.memory.MemoryGateway;
import org.springframework.stereotype.Component;

@Component
public class MedicaoMemoryPublisher {

    private final MemoryGateway memoryGateway;

    public MedicaoMemoryPublisher(MemoryGateway memoryGateway) {
        this.memoryGateway = memoryGateway;
    }
}
