package com.angico.acoes;

import com.angico.core.memory.MemoryEvent;
import com.angico.core.memory.OperationalMemoryService;
import com.angico.core.ontology.OntologyService;
import java.util.HashMap;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class AcaoMemoryPublisher {

    static final String TIPO = OntologyService.ACAO;
    private static final String SOURCE = "api";

    private final OperationalMemoryService memory;

    public AcaoMemoryPublisher(OperationalMemoryService memory) {
        this.memory = memory;
    }

    public void publicarIniciada(Acao a, String actorId) {
        String entityId = String.valueOf(a.getId());

        memory.registrarObjeto(
                a.getWorkspaceId(), TIPO, entityId, null, a.getTitulo(), a.getStatus(), SOURCE);

        Map<String, Object> payload = new HashMap<>();
        payload.put("titulo", a.getTitulo());
        payload.put("status", a.getStatus());

        memory.registrarEvento(new MemoryEvent(
                a.getWorkspaceId(), TIPO, entityId, "acao.iniciada", SOURCE,
                actorId, null, null, null, 1, a.getCreatedAt(), payload));

        if (a.getMissaoId() != null && !a.getMissaoId().isBlank()) {
            memory.registrarRelacaoAtiva(
                    a.getWorkspaceId(), OntologyService.MISSAO, a.getMissaoId(),
                    TIPO, entityId, "COMPOSTA_POR", SOURCE, null);
        }

        if (a.getResponsavelId() != null && !a.getResponsavelId().isBlank()) {
            memory.registrarRelacaoAtiva(
                    a.getWorkspaceId(), OntologyService.PESSOA, a.getResponsavelId(),
                    TIPO, entityId, "RESPONSAVEL_POR", SOURCE, null);
        }
    }
}
