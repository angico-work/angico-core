package com.angico.pessoas;

import com.angico.common.ClockProvider;
import com.angico.core.memory.MemoryEvent;
import com.angico.core.memory.OperationalMemoryService;
import com.angico.core.ontology.OntologyService;
import java.util.HashMap;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class PessoaMemoryPublisher {

    static final String TIPO = OntologyService.PESSOA;
    private static final String SOURCE = "api";

    private final OperationalMemoryService memory;
    private final ClockProvider clock;

    public PessoaMemoryPublisher(OperationalMemoryService memory, ClockProvider clock) {
        this.memory = memory;
        this.clock = clock;
    }

    public void publicarEngajada(Pessoa p, String actorId) {
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
                actorId, null, null, null, 1, p.getCreatedAt(), payload));
    }

    public void publicarAtualizada(Pessoa p, String workspaceId, String actorId) {
        String entityId = String.valueOf(p.getId());

        memory.registrarObjeto(
                workspaceId, TIPO, entityId, null, p.getNome(), p.getPapel(), SOURCE);

        Map<String, Object> payload = new HashMap<>();
        payload.put("nome", p.getNome());
        if (p.getPapel() != null) {
            payload.put("papel", p.getPapel());
        }

        memory.registrarEvento(new MemoryEvent(
                workspaceId, TIPO, entityId, "pessoa.atualizada", SOURCE,
                actorId, null, null, null, 1, clock.now(), payload));
    }
}
