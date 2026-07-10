package com.angico.missoes;

import com.angico.core.memory.MemoryEvent;
import com.angico.core.memory.OperationalMemoryService;
import com.angico.core.ontology.OntologyService;
import java.util.HashMap;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class MissaoMemoryPublisher {

    static final String TIPO = OntologyService.MISSAO;
    private static final String SOURCE = "api";

    private final OperationalMemoryService memory;

    public MissaoMemoryPublisher(OperationalMemoryService memory) {
        this.memory = memory;
    }

    public void publicarCriada(Missao m, String actorId) {
        String entityId = String.valueOf(m.getId());

        memory.registrarObjeto(
                m.getWorkspaceId(), TIPO, entityId, null, m.getTitulo(), m.getStatus(), SOURCE);

        Map<String, Object> payload = new HashMap<>();
        payload.put("titulo", m.getTitulo());
        payload.put("status", m.getStatus());
        payload.put("progresso", m.getProgresso());

        memory.registrarEvento(new MemoryEvent(
                m.getWorkspaceId(), TIPO, entityId, "missao.criada", SOURCE,
                actorId, null, null, null, 1, m.getCreatedAt(), payload));

        if (m.getProblemaId() != null && !m.getProblemaId().isBlank()) {
            memory.registrarRelacaoAtiva(
                    m.getWorkspaceId(), TIPO, entityId,
                    OntologyService.PROBLEMA, m.getProblemaId(), "ENFRENTA", SOURCE, null);
        }

        if (m.getResponsavelId() != null && !m.getResponsavelId().isBlank()) {
            memory.registrarRelacaoAtiva(
                    m.getWorkspaceId(), OntologyService.PESSOA, m.getResponsavelId(),
                    TIPO, entityId, "RESPONSAVEL_POR", SOURCE, null);
        }
    }
}
