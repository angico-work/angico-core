package com.angico.core.memory;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:memory-integration;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "angico.seed-demo-leader=false"
})
@Transactional
class MemoryPersistenceIntegrationTest {

    @Autowired private JpaMemoryGateway gateway;
    @Autowired private MemoryQueryService queries;
    @Autowired private MemoryEventRepository events;
    @Autowired private MemoryRelationRepository relations;

    @Test
    void writtenEventIsVisibleInWorkspaceAndEntityTimelines() {
        gateway.appendEvent(event("workspace-a", "OBSERVACAO", "obs-1", "actor-1"));

        List<Map<String, Object>> workspaceTimeline = queries.timelineForWorkspace("workspace-a");
        List<Map<String, Object>> entityTimeline = queries.timelineForEntity(
                "workspace-a", "OBSERVACAO", "obs-1");

        assertEquals(1, events.count());
        assertEquals(1, workspaceTimeline.size());
        assertEquals("obs-1", workspaceTimeline.getFirst().get("entityId"));
        assertEquals(1, entityTimeline.size());
    }

    @Test
    void writtenRelationIsVisibleInTheGraph() {
        gateway.upsertObject("workspace-a", "OBSERVACAO", "obs-1", null,
                "Nascente observada", "ABERTA", "api");
        gateway.upsertObject("workspace-a", "TERRITORIO", "territorio-1", null,
                "Bacia do Cedro", "ATIVO", "api");
        gateway.ensureActiveRelation("workspace-a", "OBSERVACAO", "obs-1",
                "TERRITORIO", "territorio-1", "OCORRE_EM", "api", "Registro de campo");

        Map<String, Object> graph = queries.graphForEntity("workspace-a", "OBSERVACAO", "obs-1");

        assertEquals(1, relations.count());
        assertEquals(2, ((List<?>) graph.get("nodes")).size());
        assertEquals(1, ((List<?>) graph.get("relations")).size());
    }

    @Test
    void invalidRelationDoesNotPersistAnything() {
        long before = relations.count();

        assertThrows(IllegalArgumentException.class, () -> gateway.ensureActiveRelation(
                "workspace-a", "ACAO", "acao-1", "PESSOA", "pessoa-1",
                "OCORRE_EM", "api", null));

        assertEquals(before, relations.count());
    }

    private MemoryEvent event(String workspaceId, String entityType, String entityId, String actorId) {
        return new MemoryEvent(
                workspaceId,
                entityType,
                entityId,
                "observacao.registrada",
                "api",
                actorId,
                "device-1",
                "correlation-1",
                null,
                1,
                Instant.parse("2026-07-10T12:00:00Z"),
                Map.of("title", "Nascente observada")
        );
    }
}
