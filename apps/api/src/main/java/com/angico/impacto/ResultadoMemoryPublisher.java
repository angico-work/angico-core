package com.angico.impacto;

import com.angico.core.memory.MemoryEvent;
import com.angico.core.memory.MemoryRelationMetadata;
import com.angico.core.memory.OperationalMemoryService;
import com.angico.core.ontology.OntologyService;
import java.util.HashMap;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class ResultadoMemoryPublisher {

    private static final String SOURCE = "api";

    private final OperationalMemoryService memory;

    public ResultadoMemoryPublisher(OperationalMemoryService memory) {
        this.memory = memory;
    }

    public void publish(Resultado result) {
        String resultId = String.valueOf(result.getId());
        String actionId = String.valueOf(result.getAcaoId());
        memory.registrarObjeto(
                result.getWorkspaceId(), OntologyService.RESULTADO, resultId, null,
                result.getTitulo(), result.getStatus(), SOURCE);
        memory.registrarRelacaoAtiva(
                result.getWorkspaceId(), OntologyService.ACAO, actionId,
                OntologyService.RESULTADO, resultId, "PRODUZ",
                new MemoryRelationMetadata(SOURCE, "Resultado produzido pela ação", result.getActorId(), null));

        Map<String, Object> payload = new HashMap<>();
        payload.put("acaoId", result.getAcaoId());
        payload.put("titulo", result.getTitulo());
        payload.put("status", result.getStatus());
        memory.registrarEvento(new MemoryEvent(
                result.getWorkspaceId(),
                OntologyService.RESULTADO,
                resultId,
                "resultado.registrado",
                SOURCE,
                result.getActorId(),
                null,
                null,
                null,
                1,
                result.getOccurredAt(),
                payload
        ));
    }
}
