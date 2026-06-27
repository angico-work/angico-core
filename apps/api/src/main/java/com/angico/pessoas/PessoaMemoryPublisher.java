package com.angico.pessoas;

import com.angico.core.memory.MemoryEvent;
import com.angico.core.memory.OperationalMemoryService;
import java.util.HashMap;
import java.util.Map;
import org.springframework.stereotype.Component;

/**
 * Traduz o engajamento de uma pessoa para a memória operacional do território:
 * registra o objeto e o evento de engajamento.
 */
@Component
public class PessoaMemoryPublisher {

    static final String TIPO = "pessoa";
    private static final String SOURCE = "web";

    private final OperationalMemoryService memory;

    public PessoaMemoryPublisher(OperationalMemoryService memory) {
        this.memory = memory;
    }

    public void publicarEngajada(Pessoa p) {
        String entityId = String.valueOf(p.getId());

        memory.registrarObjeto(
                p.getWorkspaceId(), TIPO, entityId, null, p.getNome(), p.getPapel(), SOURCE);

        Map<String, Object> payload = new HashMap<>();
        payload.put("nome", p.getNome());
        if (p.getPapel() != null) {
            payload.put("papel", p.getPapel());
        }

        memory.registrarEvento(new MemoryEvent(
                p.getWorkspaceId(), TIPO, entityId, "pessoa.engajada", SOURCE,
                null, null, null, null, 1, p.getCreatedAt(), payload));
    }
}
