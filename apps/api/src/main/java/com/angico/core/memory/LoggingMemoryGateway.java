package com.angico.core.memory;

import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class LoggingMemoryGateway implements MemoryGateway {

    private static final Logger LOGGER =
            LoggerFactory.getLogger(LoggingMemoryGateway.class);

    @Override
    public MemoryEventResult appendEvent(MemoryEvent event) {
        String eventId = UUID.randomUUID().toString();

        LOGGER.info(
                "Memory event: eventId={}, workspace={}, entity={}:{}, type={}",
                eventId,
                event.workspaceId(),
                event.entityType(),
                event.entityId(),
                event.eventType()
        );

        return new MemoryEventResult(eventId, 0L, 0L, 0L);
    }

    @Override
    public void upsertObject(
            String workspaceId,
            String entityType,
            String entityId,
            String externalCode,
            String name,
            String status,
            String source
    ) {
        LOGGER.info(
                "Memory object: workspace={}, entity={}:{}, status={}",
                workspaceId,
                entityType,
                entityId,
                status
        );
    }

    @Override
    public void ensureActiveRelation(
            String workspaceId,
            String originType,
            String originId,
            String destinationType,
            String destinationId,
            String relationType,
            String source,
            String notes
    ) {
        LOGGER.info(
                "Memory relation: workspace={}, {}:{} -[{}]-> {}:{}",
                workspaceId,
                originType,
                originId,
                relationType,
                destinationType,
                destinationId
        );
    }

    @Override
    public void replaceActiveRelation(
            String workspaceId,
            String originType,
            String originId,
            String destinationType,
            String destinationId,
            String relationType,
            String source,
            String notes
    ) {
        LOGGER.info(
                "Memory relation replaced: workspace={}, {}:{} -[{}]-> {}:{}",
                workspaceId,
                originType,
                originId,
                relationType,
                destinationType,
                destinationId
        );
    }

    @Override
    public int endActiveRelations(
            String workspaceId,
            String originType,
            String originId,
            String relationType
    ) {
        LOGGER.info(
                "Memory relations ended: workspace={}, {}:{} type={}",
                workspaceId,
                originType,
                originId,
                relationType
        );

        return 0;
    }
}
