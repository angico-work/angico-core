package com.angico.potencialidades;

import com.angico.core.memory.MemoryGateway;
import org.springframework.stereotype.Component;

@Component
public class PotencialidadeMemoryPublisher {

    private final MemoryGateway memoryGateway;

    public PotencialidadeMemoryPublisher(MemoryGateway memoryGateway) {
        this.memoryGateway = memoryGateway;
    }
}
