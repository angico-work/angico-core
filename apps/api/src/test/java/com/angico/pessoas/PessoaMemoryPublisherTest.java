package com.angico.pessoas;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import com.angico.common.ClockProvider;
import com.angico.core.memory.MemoryEvent;
import com.angico.core.memory.OperationalMemoryService;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

class PessoaMemoryPublisherTest {

    private final OperationalMemoryService memory = mock(OperationalMemoryService.class);
    private final ClockProvider clock = mock(ClockProvider.class);
    private final PessoaMemoryPublisher publisher = new PessoaMemoryPublisher(memory, clock);

    @Test
    void engagementRecordsTheAuthenticatedActor() {
        Pessoa pessoa = pessoa();

        publisher.publicarEngajada(pessoa, "gestora.sp");

        ArgumentCaptor<MemoryEvent> event = ArgumentCaptor.forClass(MemoryEvent.class);
        verify(memory).registrarEvento(event.capture());
        assertEquals("pessoa.engajada", event.getValue().eventType());
        assertEquals("gestora.sp", event.getValue().actorId());
    }

    @Test
    void profileUpdateRecordsTheAuthorizedWorkspaceAndActor() {
        Instant now = Instant.parse("2026-07-10T19:00:00Z");
        when(clock.now()).thenReturn(now);

        publisher.publicarAtualizada(pessoa(), "workspace-atual", "ana.sp");

        ArgumentCaptor<MemoryEvent> event = ArgumentCaptor.forClass(MemoryEvent.class);
        verify(memory).registrarEvento(event.capture());
        assertEquals("workspace-atual", event.getValue().workspaceId());
        assertEquals("pessoa.atualizada", event.getValue().eventType());
        assertEquals("ana.sp", event.getValue().actorId());
        assertEquals(now, event.getValue().occurredAt());
        verify(memory).registrarObjeto(
                "workspace-atual", "PESSOA", "42", null, "Ana", "Mobilizadora", "api");
        verifyNoMoreInteractions(memory);
    }

    private Pessoa pessoa() {
        Pessoa pessoa = new Pessoa(
                "workspace-legado",
                "Ana",
                "Mobilizadora",
                Instant.parse("2026-07-10T18:00:00Z"));
        ReflectionTestUtils.setField(pessoa, "id", 42L);
        pessoa.setAngicoId("ana.sp");
        return pessoa;
    }
}
