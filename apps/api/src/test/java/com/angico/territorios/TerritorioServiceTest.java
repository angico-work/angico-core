package com.angico.territorios;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.angico.common.ClockProvider;
import com.angico.core.memory.MemoryEvent;
import com.angico.core.memory.OperationalMemoryService;
import com.angico.workspaces.WorkspaceAuthorizationService;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import tools.jackson.databind.json.JsonMapper;

class TerritorioServiceTest {

    private final TerritorioRepository repository = mock(TerritorioRepository.class);
    private final OperationalMemoryService memory = mock(OperationalMemoryService.class);
    private final WorkspaceAuthorizationService authorization = mock(WorkspaceAuthorizationService.class);
    private final ClockProvider clock = mock(ClockProvider.class);
    private final TerritorioService service = new TerritorioService(
            repository, memory, authorization, JsonMapper.builder().build(), clock);

    @Test
    void creationRecordsTheAuthenticatedActorAndClock() {
        Instant now = Instant.parse("2026-07-10T18:00:00Z");
        when(authorization.requireWritableWorkspace("workspace-a")).thenReturn("workspace-a");
        when(authorization.currentActorId()).thenReturn("ana.silva");
        when(clock.now()).thenReturn(now);
        when(repository.save(any(Territorio.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.create(new TerritorioCreateRequest(
                "workspace-a", "Vila Esperança", "BAIRRO", "Recife", null,
                "PE", "Brasil", null, null, List.of()));

        ArgumentCaptor<MemoryEvent> event = ArgumentCaptor.forClass(MemoryEvent.class);
        verify(memory).registrarEvento(event.capture());
        assertEquals("ana.silva", event.getValue().actorId());
        assertEquals(now, event.getValue().occurredAt());
    }

    @Test
    void rejectsNonFiniteCoordinatesAndBoundingBoxes() {
        assertThrows(IllegalArgumentException.class, () -> service.create(new TerritorioCreateRequest(
                "workspace-a", "Vila", null, null, null, null, null,
                Double.NaN, 10d, List.of())));
        assertThrows(IllegalArgumentException.class, () -> service.create(new TerritorioCreateRequest(
                "workspace-a", "Vila", null, null, null, null, null,
                null, null, List.of(-10d, Double.POSITIVE_INFINITY, -9d, -30d))));

        verify(repository, never()).save(any());
    }
}
