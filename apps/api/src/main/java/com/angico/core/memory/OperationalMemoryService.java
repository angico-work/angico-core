package com.angico.core.memory;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OperationalMemoryService {

    private final MemoryGateway memoryGateway;

    public OperationalMemoryService(MemoryGateway memoryGateway) {
        this.memoryGateway = memoryGateway;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public MemoryEventResult registrarEvento(MemoryEvent event) {
        return memoryGateway.appendEvent(event);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void registrarObjeto(
            String workspaceId,
            String entityType,
            String entityId,
            String externalCode,
            String name,
            String status,
            String source
    ) {
        memoryGateway.upsertObject(
                workspaceId,
                entityType,
                entityId,
                externalCode,
                name,
                status,
                source
        );
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void registrarRelacaoAtiva(
            String workspaceId,
            String originType,
            String originId,
            String destinationType,
            String destinationId,
            String relationType,
            String source,
            String notes
    ) {
        memoryGateway.ensureActiveRelation(
                workspaceId,
                originType,
                originId,
                destinationType,
                destinationId,
                relationType,
                source,
                notes
        );
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void substituirRelacaoAtiva(
            String workspaceId,
            String originType,
            String originId,
            String destinationType,
            String destinationId,
            String relationType,
            String source,
            String notes
    ) {
        memoryGateway.replaceActiveRelation(
                workspaceId,
                originType,
                originId,
                destinationType,
                destinationId,
                relationType,
                source,
                notes
        );
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public int encerrarRelacoesAtivas(
            String workspaceId,
            String originType,
            String originId,
            String relationType
    ) {
        return memoryGateway.endActiveRelations(
                workspaceId,
                originType,
                originId,
                relationType
        );
    }
}
