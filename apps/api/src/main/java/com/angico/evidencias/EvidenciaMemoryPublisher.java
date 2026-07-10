package com.angico.evidencias;

import com.angico.core.memory.MemoryEvent;
import com.angico.core.memory.MemoryRelationMetadata;
import com.angico.core.memory.MemorySyncStatus;
import com.angico.core.memory.OperationalMemoryService;
import com.angico.core.ontology.OntologyService;
import java.util.HashMap;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class EvidenciaMemoryPublisher {

    private static final String SOURCE = "api";

    private final OperationalMemoryService memory;

    public EvidenciaMemoryPublisher(OperationalMemoryService memory) {
        this.memory = memory;
    }

    public void publish(Evidencia evidence) {
        String evidenceId = String.valueOf(evidence.getId());
        MemoryRelationMetadata metadata = new MemoryRelationMetadata(
                SOURCE, "Evidência vinculada ao registro de origem", evidence.getActorId(), null);

        memory.registrarObjeto(
                evidence.getWorkspaceId(), OntologyService.EVIDENCIA, evidenceId, null,
                evidence.getTitle(), "REGISTRADA", SOURCE);
        registerSubjectRelation(evidence, evidenceId, metadata);

        Map<String, Object> payload = new HashMap<>();
        payload.put("subjectType", evidence.getSubjectType());
        payload.put("subjectId", evidence.getSubjectId());
        payload.put("title", evidence.getTitle());
        payload.put("capturedAt", evidence.getCapturedAt().toString());
        if (evidence.getSha256() != null) {
            payload.put("sha256", evidence.getSha256());
            payload.put("contentType", evidence.getContentType());
            payload.put("sizeBytes", evidence.getSizeBytes());
        }

        memory.registrarEvento(new MemoryEvent(
                evidence.getWorkspaceId(),
                OntologyService.EVIDENCIA,
                evidenceId,
                "evidencia.registrada",
                SOURCE,
                evidence.getActorId(),
                evidence.getDeviceId(),
                null,
                null,
                1,
                evidence.getCapturedAt(),
                payload,
                evidence.getClientMutationId(),
                offlineStatus(evidence)
        ));
    }

    private void registerSubjectRelation(
            Evidencia evidence,
            String evidenceId,
            MemoryRelationMetadata metadata
    ) {
        String subjectId = String.valueOf(evidence.getSubjectId());
        switch (evidence.getSubjectType()) {
            case OntologyService.OBSERVACAO -> memory.registrarRelacaoAtiva(
                    evidence.getWorkspaceId(), OntologyService.OBSERVACAO, subjectId,
                    OntologyService.EVIDENCIA, evidenceId, "COMPROVADA_POR", metadata);
            case OntologyService.ACAO -> memory.registrarRelacaoAtiva(
                    evidence.getWorkspaceId(), OntologyService.ACAO, subjectId,
                    OntologyService.EVIDENCIA, evidenceId, "GERA", metadata);
            case OntologyService.RESULTADO -> memory.registrarRelacaoAtiva(
                    evidence.getWorkspaceId(), OntologyService.EVIDENCIA, evidenceId,
                    OntologyService.RESULTADO, subjectId, "SUSTENTA", metadata);
            default -> throw new IllegalArgumentException("Tipo de vínculo de evidência inválido.");
        }
    }

    private MemorySyncStatus offlineStatus(Evidencia evidence) {
        return evidence.getClientMutationId() == null && evidence.getDeviceId() == null
                ? MemorySyncStatus.SERVER_RECORDED
                : MemorySyncStatus.SYNCED_FROM_OFFLINE;
    }
}
