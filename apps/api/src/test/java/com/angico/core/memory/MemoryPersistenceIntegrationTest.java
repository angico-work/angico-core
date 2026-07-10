package com.angico.core.memory;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
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
    @Autowired private MemoryObjectRepository objects;
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
        Map<String, Object> otherWorkspace = queries.graphForEntity(
                "workspace-b", "OBSERVACAO", "obs-1");

        assertEquals(1, relations.count());
        assertEquals(2, ((List<?>) graph.get("nodes")).size());
        assertEquals(1, ((List<?>) graph.get("relations")).size());
        Map<?, ?> edge = (Map<?, ?>) ((List<?>) graph.get("relations")).getFirst();
        assertEquals("api", edge.get("source"));
        assertEquals("Registro de campo", edge.get("notes"));
        assertEquals(true, edge.get("active"));
        assertNotNull(edge.get("createdAt"));
        assertEquals(true, edge.get("ontologyValid"));
        assertFalse(edge.containsKey("confidence"));
        assertEquals(0, ((List<?>) otherWorkspace.get("relations")).size());
    }

    @Test
    void invalidRelationDoesNotPersistAnything() {
        long before = relations.count();

        assertThrows(IllegalArgumentException.class, () -> gateway.ensureActiveRelation(
                "workspace-a", "ACAO", "acao-1", "PESSOA", "pessoa-1",
                "OCORRE_EM", "api", null));

        assertEquals(before, relations.count());
    }

    @Test
    void eventMetadataDistinguishesOccurrenceFromServerRecording() {
        gateway.appendEvent(event("workspace-a", "OBSERVACAO", "obs-1", "actor-1"));

        Map<String, Object> row = queries.timelineForWorkspace("workspace-a").getFirst();

        assertEquals("workspace-a", row.get("organizationId"));
        assertEquals("api", row.get("source"));
        assertEquals("device-1", row.get("deviceId"));
        assertEquals("correlation-1", row.get("correlationId"));
        assertEquals("SERVER_RECORDED", row.get("syncStatus"));
        assertEquals(Instant.parse("2026-07-10T12:00:00Z"), row.get("occurredAt"));
        assertNotNull(row.get("recordedAt"));
        assertNull(row.get("idempotencyKey"));
    }

    @Test
    void queryFiltersNeverEscapeTheRequestedWorkspace() {
        gateway.appendEvent(event("workspace-a", "OBSERVACAO", "obs-1", "actor-1"));
        gateway.appendEvent(new MemoryEvent(
                "workspace-a",
                "ACAO",
                "acao-1",
                "acao.iniciada",
                "offline",
                "actor-2",
                "device-2",
                "correlation-2",
                "obs-1",
                1,
                Instant.parse("2026-07-10T13:00:00Z"),
                Map.of("title", "Mutirão"),
                "idem-2",
                MemorySyncStatus.SYNCED_FROM_OFFLINE
        ));
        gateway.appendEvent(new MemoryEvent(
                "workspace-b",
                "ACAO",
                "acao-2",
                "acao.iniciada",
                "offline",
                "actor-2",
                "device-2",
                null,
                null,
                1,
                Instant.parse("2026-07-10T13:00:00Z"),
                Map.of(),
                "idem-other-workspace",
                MemorySyncStatus.SYNCED_FROM_OFFLINE
        ));

        List<Map<String, Object>> result = queries.timeline(new MemoryQuery(
                "workspace-a",
                "acao",
                null,
                Instant.parse("2026-07-10T12:30:00Z"),
                Instant.parse("2026-07-10T13:30:00Z"),
                "acao.iniciada",
                "actor-2",
                "offline",
                "SYNCED_FROM_OFFLINE"
        ));

        assertEquals(1, result.size());
        assertEquals("acao-1", result.getFirst().get("entityId"));
        assertEquals("idem-2", result.getFirst().get("idempotencyKey"));
    }

    @Test
    void invalidEventTypeAndPayloadNeverCreatePartialRows() {
        long before = events.count();
        MemoryEvent unknownType = event("workspace-a", "DESCONHECIDO", "x-1", "actor-1");
        Map<String, Object> invalidPayload = new HashMap<>();
        invalidPayload.put("unsupported", new Object());
        MemoryEvent invalidEvent = new MemoryEvent(
                "workspace-a", "OBSERVACAO", "obs-1", "observacao.registrada", "api",
                "actor-1", null, null, null, 1, Instant.now(), invalidPayload);

        assertThrows(IllegalArgumentException.class, () -> gateway.appendEvent(unknownType));
        assertThrows(IllegalArgumentException.class, () -> gateway.appendEvent(invalidEvent));
        assertEquals(before, events.count());
    }

    @Test
    void legacyLowercaseRowsRemainReadableWithoutCopyingThem() {
        Instant now = Instant.parse("2025-01-10T12:00:00Z");
        objects.save(new StoredMemoryObject(
                "workspace-a", "observacao", "legacy-obs", null,
                "Registro legado", "ABERTA", "legacy", now));
        objects.save(new StoredMemoryObject(
                "workspace-a", "territorio", "legacy-territory", null,
                "Territorio legado", "ATIVO", "legacy", now));
        relations.save(new StoredMemoryRelation(
                "workspace-a", "observacao", "legacy-obs", "territorio", "legacy-territory",
                "ocorre_em", "legacy", null, now));
        events.save(new StoredMemoryEvent(
                UUID.randomUUID().toString(), "workspace-a", "observacao", "legacy-obs",
                "observacao.registrada", "legacy", "actor-legacy", null, null, null,
                1, now, null, null, null, "{}"));

        List<Map<String, Object>> timeline = queries.timelineForEntity(
                "workspace-a", "OBSERVACAO", "legacy-obs");
        Map<String, Object> graph = queries.graphForEntity(
                "workspace-a", "OBSERVACAO", "legacy-obs");

        assertEquals(1, timeline.size());
        assertEquals("OBSERVACAO", timeline.getFirst().get("entityType"));
        assertEquals(2, ((List<?>) graph.get("nodes")).size());
    }

    @Test
    void ambiguousLegacyObjectsFailInsteadOfBeingMerged() {
        Instant now = Instant.parse("2025-01-10T12:00:00Z");
        objects.save(new StoredMemoryObject(
                "workspace-a", "observacao", "duplicated", null,
                "Lowercase", "ABERTA", "legacy", now));
        objects.save(new StoredMemoryObject(
                "workspace-a", "OBSERVACAO", "duplicated", null,
                "Uppercase", "ABERTA", "api", now));
        objects.save(new StoredMemoryObject(
                "workspace-a", "TERRITORIO", "territory", null,
                "Territorio", "ATIVO", "api", now));
        relations.save(new StoredMemoryRelation(
                "workspace-a", "OBSERVACAO", "duplicated", "TERRITORIO", "territory",
                "OCORRE_EM", "api", null, now));

        assertThrows(IllegalStateException.class, () ->
                queries.graphForEntity("workspace-a", "OBSERVACAO", "duplicated"));
    }

    @Test
    void queryRejectsInvalidPeriodsAndSyncStates() {
        assertThrows(IllegalArgumentException.class, () -> new MemoryQuery(
                "workspace-a", null, null,
                Instant.parse("2026-07-11T00:00:00Z"),
                Instant.parse("2026-07-10T00:00:00Z"),
                null, null, null, null));
        assertThrows(IllegalArgumentException.class, () -> new MemoryQuery(
                "workspace-a", null, null, null, null,
                null, null, null, "UNKNOWN"));
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
