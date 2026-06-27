package com.angico.territorios;

import com.angico.core.memory.MemoryGateway;
import org.springframework.stereotype.Component;

@Component
public class TerritorioMemoryPublisher {

    private final MemoryGateway memoryGateway;

    public TerritorioMemoryPublisher(MemoryGateway memoryGateway) {
        this.memoryGateway = memoryGateway;
    }
}
