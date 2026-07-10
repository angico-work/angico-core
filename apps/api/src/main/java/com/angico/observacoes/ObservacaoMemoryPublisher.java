package com.angico.observacoes;

import com.angico.core.memory.MemoryEvent;
import com.angico.core.memory.MemoryRelationMetadata;
import com.angico.core.memory.MemorySyncStatus;
import com.angico.core.memory.OperationalMemoryService;
import com.angico.core.ontology.OntologyService;
import java.util.HashMap;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class ObservacaoMemoryPublisher {

    static final String TIPO = OntologyService.OBSERVACAO;
    private static final String SOURCE = "api";

    private final OperationalMemoryService memory;

    public ObservacaoMemoryPublisher(OperationalMemoryService memory) {
        this.memory = memory;
    }

    public void publicarRegistrada(ObservacaoTerritorial o) {
        publicarRegistrada(o, null, false);
    }

    public void publicarRegistrada(
            ObservacaoTerritorial o,
            String idempotencyKey,
            boolean offlineMetadataPresent
    ) {
        String entityId = String.valueOf(o.getId());

        memory.registrarObjeto(
                o.getWorkspaceId(), TIPO, entityId, null, o.getTitulo(), o.getStatus(), SOURCE);

        Map<String, Object> payload = new HashMap<>();
        payload.put("categoria", o.getCategoria());
        payload.put("urgencia", o.getUrgencia());
        if (o.getLocalizacao() != null) {
            payload.put("localizacao", o.getLocalizacao());
        }
        payload.put("titulo", o.getTitulo());
        if (o.getClientMutationId() != null) {
            payload.put("clientMutationId", o.getClientMutationId());
        }

        memory.registrarEvento(new MemoryEvent(
                o.getWorkspaceId(), TIPO, entityId, "observacao.registrada", SOURCE,
                o.getAutorId(), o.getDeviceId(), null, null, 1, o.getOccurredAt(), payload,
                idempotencyKey,
                offlineMetadataPresent
                        ? MemorySyncStatus.SYNCED_FROM_OFFLINE
                        : MemorySyncStatus.SERVER_RECORDED));

        if (o.getTerritorioId() != null && !o.getTerritorioId().isBlank()) {
            memory.registrarRelacaoAtiva(
                    o.getWorkspaceId(), TIPO, entityId,
                    OntologyService.TERRITORIO, o.getTerritorioId(), "OCORRE_EM",
                    new MemoryRelationMetadata(SOURCE, null, o.getAutorId(), null));
        }
    }
}
