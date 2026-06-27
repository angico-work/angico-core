package com.angico.observacoes;

import com.angico.core.memory.MemoryGateway;
import org.springframework.stereotype.Component;

@Component
public class ObservacaoMemoryPublisher {

    private final MemoryGateway memoryGateway;

    public ObservacaoMemoryPublisher(MemoryGateway memoryGateway) {
        this.memoryGateway = memoryGateway;
    }
}
