package com.angico.problemas;

import com.angico.core.memory.MemoryEvent;
import com.angico.core.memory.MemoryRelationMetadata;
import com.angico.core.memory.OperationalMemoryService;
import com.angico.core.ontology.OntologyService;
import java.util.HashMap;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class ProblemaMemoryPublisher {

    static final String TIPO = OntologyService.PROBLEMA;
    private static final String SOURCE = "api";

    private final OperationalMemoryService memory;

    public ProblemaMemoryPublisher(OperationalMemoryService memory) {
        this.memory = memory;
    }

    public void publicarRegistrado(ProblemaSocioambiental p) {
        String entityId = String.valueOf(p.getId());
        MemoryRelationMetadata metadata = new MemoryRelationMetadata(
                SOURCE, null, p.getAutorId(), null);

        memory.registrarObjeto(
                p.getWorkspaceId(), TIPO, entityId, null, p.getTitulo(), p.getStatus(), SOURCE);

        Map<String, Object> payload = new HashMap<>();
        payload.put("categoria", p.getCategoria());
        payload.put("severidade", p.getSeveridade());
        if (p.getLocalizacao() != null) {
            payload.put("localizacao", p.getLocalizacao());
        }
        payload.put("titulo", p.getTitulo());

        memory.registrarEvento(new MemoryEvent(
                p.getWorkspaceId(), TIPO, entityId, "problema.registrado", SOURCE,
                p.getAutorId(), null, null, null, 1, p.getCreatedAt(), payload));

        if (p.getOrigemObservacaoId() != null && !p.getOrigemObservacaoId().isBlank()) {
            memory.registrarRelacaoAtiva(
                    p.getWorkspaceId(), OntologyService.OBSERVACAO, p.getOrigemObservacaoId(),
                    TIPO, entityId, "IDENTIFICA", metadata);
        }

        if (p.getTerritorioId() != null && !p.getTerritorioId().isBlank()) {
            memory.registrarRelacaoAtiva(
                    p.getWorkspaceId(), TIPO, entityId,
                    OntologyService.TERRITORIO, p.getTerritorioId(), "AFETA", metadata);
        }
    }
}
