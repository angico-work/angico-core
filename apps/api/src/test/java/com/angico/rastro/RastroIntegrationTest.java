package com.angico.rastro;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.angico.auth.PasswordHasher;
import com.angico.core.memory.MemoryEventRepository;
import com.angico.core.memory.MemoryObjectRepository;
import com.angico.core.memory.MemoryRelationMetadata;
import com.angico.core.memory.MemoryRelationRepository;
import com.angico.core.memory.StoredMemoryEvent;
import com.angico.core.memory.StoredMemoryObject;
import com.angico.core.memory.StoredMemoryRelation;
import com.angico.pessoas.Pessoa;
import com.angico.pessoas.PessoaRepository;
import com.angico.workspaces.Workspace;
import com.angico.workspaces.WorkspaceMember;
import com.angico.workspaces.WorkspaceMemberRepository;
import com.angico.workspaces.WorkspaceRepository;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:rastro-domain;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "angico.auth.required=true",
        "angico.auth.public-registration=false",
        "angico.auth.cookie-secure=false",
        "angico.seed-demo-leader=false"
})
@AutoConfigureMockMvc
class RastroIntegrationTest {

    private static final AtomicInteger IDS = new AtomicInteger();

    @Autowired private MockMvc mvc;
    @Autowired private PasswordHasher passwordHasher;
    @Autowired private PessoaRepository pessoaRepository;
    @Autowired private WorkspaceRepository workspaceRepository;
    @Autowired private WorkspaceMemberRepository memberRepository;
    @Autowired private MemoryObjectRepository objectRepository;
    @Autowired private MemoryRelationRepository relationRepository;
    @Autowired private MemoryEventRepository eventRepository;

    private String workspaceA;
    private String workspaceB;
    private Pessoa actor;
    private Cookie session;

    @BeforeEach
    void setUp() throws Exception {
        int id = IDS.incrementAndGet();
        workspaceA = "trace-a-" + id;
        workspaceB = "trace-b-" + id;
        workspaceRepository.save(new Workspace(workspaceA, "Rastro A " + id, null, Instant.now()));
        workspaceRepository.save(new Workspace(workspaceB, "Rastro B " + id, null, Instant.now()));
        actor = createPerson(workspaceA, "trace.actor." + id, "trace-" + id + "@example.test");
        createPerson(workspaceB, "trace.other." + id, "trace-other-" + id + "@example.test");
        session = login(actor);
    }

    @Test
    void relationClosesOnlyItsOwnIndependentGap() throws Exception {
        object(workspaceA, "ACAO", "action-independent", "Mutirão");
        event(workspaceA, "ACAO", "action-independent", "acao.iniciada",
                Instant.parse("2026-07-01T12:00:00Z"), Instant.parse("2026-07-01T12:01:00Z"));

        mvc.perform(trace(workspaceA, "ACAO", "action-independent"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.gaps[*].code", hasItems(
                        "ACAO_SEM_MISSAO", "ACAO_SEM_EVIDENCIA", "ACAO_SEM_RESULTADO")));

        object(workspaceA, "MISSAO", "mission-linked", "Cuidar da nascente");
        relation(workspaceA, "MISSAO", "mission-linked", "ACAO", "action-independent", "COMPOSTA_POR");

        mvc.perform(trace(workspaceA, "ACAO", "action-independent"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.gaps[*].code", not(hasItem("ACAO_SEM_MISSAO"))))
                .andExpect(jsonPath("$.gaps[*].code", hasItems(
                        "ACAO_SEM_EVIDENCIA", "ACAO_SEM_RESULTADO")));
    }

    @Test
    void resultWithoutSupportingEvidenceRemainsAnExplicitGap() throws Exception {
        object(workspaceA, "ACAO", "action-result", "Plantio");
        object(workspaceA, "RESULTADO", "result-unproven", "Mudas plantadas");
        relation(workspaceA, "ACAO", "action-result", "RESULTADO", "result-unproven", "PRODUZ");

        mvc.perform(trace(workspaceA, "ACAO", "action-result"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.gaps[?(@.code == 'RESULTADO_SEM_EVIDENCIA')].subject.id",
                        hasItem("result-unproven")));
    }

    @Test
    void includesOnlyMeasurementsLinkedToAValidIndicator() throws Exception {
        object(workspaceA, "ACAO", "action-measured", "Recuperação");
        object(workspaceA, "RESULTADO", "result-measured", "Margem recuperada");
        object(workspaceA, "INDICADOR", "indicator-valid", "Metros protegidos");
        object(workspaceA, "MEDICAO", "measurement-valid", "Trinta metros");
        object(workspaceA, "MEDICAO", "measurement-orphan", "Registro órfão");
        relation(workspaceA, "ACAO", "action-measured", "RESULTADO", "result-measured", "PRODUZ");
        relation(workspaceA, "INDICADOR", "indicator-valid", "RESULTADO", "result-measured", "MEDE");
        relation(workspaceA, "MEDICAO", "measurement-valid", "INDICADOR", "indicator-valid", "REFERE_SE_A");

        mvc.perform(trace(workspaceA, "ACAO", "action-measured"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stages[*].reference.id", hasItem("measurement-valid")))
                .andExpect(jsonPath("$.stages[*].reference.id", not(hasItem("measurement-orphan"))))
                .andExpect(jsonPath("$.gaps[?(@.code == 'INDICADOR_SEM_MEDICAO')]", hasSize(0)));
    }

    @Test
    void orphanMeasurementRelationDoesNotCloseTheIndicatorGap() throws Exception {
        object(workspaceA, "ACAO", "action-orphan-measurement", "Acompanhamento");
        object(workspaceA, "RESULTADO", "result-orphan-measurement", "Resultado acompanhado");
        object(workspaceA, "INDICADOR", "indicator-orphan-measurement", "Indicador sem medição");
        relation(workspaceA, "ACAO", "action-orphan-measurement",
                "RESULTADO", "result-orphan-measurement", "PRODUZ");
        relation(workspaceA, "INDICADOR", "indicator-orphan-measurement",
                "RESULTADO", "result-orphan-measurement", "MEDE");
        relation(workspaceA, "MEDICAO", "missing-measurement",
                "INDICADOR", "indicator-orphan-measurement", "REFERE_SE_A");

        mvc.perform(trace(workspaceA, "ACAO", "action-orphan-measurement"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.gaps[?(@.code == 'INDICADOR_SEM_MEDICAO')].subject.id",
                        hasItem("indicator-orphan-measurement")))
                .andExpect(jsonPath("$.stages[*].reference.id", not(hasItem("missing-measurement"))));
    }

    @Test
    void ordersEventsByOccurredTimeAndPreservesRecordedTime() throws Exception {
        object(workspaceA, "ACAO", "action-events", "Vistoria");
        String later = event(workspaceA, "ACAO", "action-events", "acao.concluida",
                Instant.parse("2026-07-08T15:00:00Z"), Instant.parse("2026-07-08T15:01:00Z"));
        String earlierRecordedLater = event(workspaceA, "ACAO", "action-events", "acao.iniciada",
                Instant.parse("2026-07-08T10:00:00Z"), Instant.parse("2026-07-09T08:00:00Z"));

        mvc.perform(trace(workspaceA, "ACAO", "action-events"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.events[0].id").value(earlierRecordedLater))
                .andExpect(jsonPath("$.events[0].occurredAt").value("2026-07-08T10:00:00Z"))
                .andExpect(jsonPath("$.events[0].recordedAt").value("2026-07-09T08:00:00Z"))
                .andExpect(jsonPath("$.events[1].id").value(later));
    }

    @Test
    void queryDoesNotMutateCanonicalMemory() throws Exception {
        object(workspaceA, "ACAO", "action-read-only", "Consulta");
        event(workspaceA, "ACAO", "action-read-only", "acao.iniciada",
                Instant.parse("2026-07-02T10:00:00Z"), Instant.parse("2026-07-02T10:01:00Z"));
        long objectsBefore = objectRepository.count();
        long relationsBefore = relationRepository.count();
        long eventsBefore = eventRepository.count();

        mvc.perform(trace(workspaceA, "ACAO", "action-read-only"))
                .andExpect(status().isOk());

        assertEquals(objectsBefore, objectRepository.count());
        assertEquals(relationsBefore, relationRepository.count());
        assertEquals(eventsBefore, eventRepository.count());
    }

    @Test
    void returnsParticipantsAsSafeReferencesWithoutEventPayloads() throws Exception {
        object(workspaceA, "ACAO", "action-participant", "Roda de campo");
        object(workspaceA, "PESSOA", actor.getAngicoId(), "Agente local");
        relation(workspaceA, "PESSOA", actor.getAngicoId(), "ACAO", "action-participant", "RESPONSAVEL_POR");
        event(workspaceA, "ACAO", "action-participant", "acao.iniciada",
                Instant.parse("2026-07-03T10:00:00Z"), Instant.parse("2026-07-03T10:01:00Z"));

        MvcResult response = mvc.perform(trace(workspaceA, "ACAO", "action-participant"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.participants[0].participant.id").value(actor.getAngicoId()))
                .andExpect(jsonPath("$.participants[0].relationType").value("RESPONSAVEL_POR"))
                .andExpect(jsonPath("$.participants[0].participant.resource").value("pessoas"))
                .andExpect(jsonPath("$.events[0].payload").doesNotExist())
                .andReturn();

        assertFalse(response.getResponse().getContentAsString().contains(actor.getEmail()));
    }

    @Test
    void enforcesWorkspaceIsolationBeforeExpandingTheGraph() throws Exception {
        object(workspaceB, "ACAO", "action-private", "Ação reservada");

        mvc.perform(trace(workspaceB, "ACAO", "action-private"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    void capsGraphExpansionAtRequestedLimits() throws Exception {
        object(workspaceA, "ACAO", "action-limited", "Ação central");
        object(workspaceA, "MISSAO", "mission-limited", "Missão");
        object(workspaceA, "RESULTADO", "result-limited", "Resultado");
        object(workspaceA, "EVIDENCIA", "evidence-limited", "Evidência");
        relation(workspaceA, "MISSAO", "mission-limited", "ACAO", "action-limited", "COMPOSTA_POR");
        relation(workspaceA, "ACAO", "action-limited", "RESULTADO", "result-limited", "PRODUZ");
        relation(workspaceA, "ACAO", "action-limited", "EVIDENCIA", "evidence-limited", "GERA");

        mvc.perform(trace(workspaceA, "ACAO", "action-limited")
                        .param("maxNodes", "2")
                        .param("maxRelations", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stages", hasSize(2)))
                .andExpect(jsonPath("$.relations", hasSize(1)))
                .andExpect(jsonPath("$.limits.truncated").value(true));
    }

    @Test
    void actionTraceDoesNotExpandToSiblingActionsThroughItsMission() throws Exception {
        object(workspaceA, "MISSAO", "mission-shared", "Missão compartilhada");
        object(workspaceA, "ACAO", "action-root", "Ação consultada");
        object(workspaceA, "ACAO", "action-sibling", "Ação fora do percurso");
        relation(workspaceA, "MISSAO", "mission-shared", "ACAO", "action-root", "COMPOSTA_POR");
        relation(workspaceA, "MISSAO", "mission-shared", "ACAO", "action-sibling", "COMPOSTA_POR");

        mvc.perform(trace(workspaceA, "ACAO", "action-root"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stages[*].reference.id", hasItem("action-root")))
                .andExpect(jsonPath("$.stages[*].reference.id", not(hasItem("action-sibling"))));
    }

    @Test
    void nonTraceRelationsCannotCrowdAValidRelationOutOfTheRequestedLimit() throws Exception {
        object(workspaceA, "ACAO", "action-crowded", "Ação com memória extensa");
        for (int index = 0; index < 8; index++) {
            String messageId = "message-noise-" + index;
            object(workspaceA, "MENSAGEM", messageId, "Ruído " + index);
            relation(workspaceA, "MENSAGEM", messageId,
                    "ACAO", "action-crowded", "MENCIONA");
        }
        object(workspaceA, "RESULTADO", "result-after-noise", "Resultado verificável");
        relation(workspaceA, "ACAO", "action-crowded",
                "RESULTADO", "result-after-noise", "PRODUZ");

        mvc.perform(trace(workspaceA, "ACAO", "action-crowded")
                        .param("maxRelations", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.relations", hasSize(1)))
                .andExpect(jsonPath("$.relations[0].type").value("PRODUZ"))
                .andExpect(jsonPath("$.stages[*].reference.id", hasItem("result-after-noise")));
    }

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder trace(
            String workspaceId,
            String rootType,
            String rootId
    ) {
        return get("/api/rastro/{rootType}/{rootId}", rootType, rootId)
                .param("workspaceId", workspaceId)
                .cookie(session);
    }

    private StoredMemoryObject object(String workspaceId, String type, String id, String name) {
        return objectRepository.save(new StoredMemoryObject(
                workspaceId, type, id, null, name, "ATIVO", "test", Instant.now()));
    }

    private StoredMemoryRelation relation(
            String workspaceId,
            String originType,
            String originId,
            String destinationType,
            String destinationId,
            String relationType
    ) {
        return relationRepository.save(new StoredMemoryRelation(
                workspaceId, originType, originId, destinationType, destinationId, relationType,
                new MemoryRelationMetadata("test", null, actor.getAngicoId(), null), Instant.now()));
    }

    private String event(
            String workspaceId,
            String entityType,
            String entityId,
            String eventType,
            Instant occurredAt,
            Instant recordedAt
    ) {
        String eventId = UUID.randomUUID().toString();
        eventRepository.save(new StoredMemoryEvent(
                eventId,
                workspaceId,
                entityType,
                entityId,
                eventType,
                "test",
                actor.getAngicoId(),
                null,
                null,
                null,
                1,
                occurredAt,
                recordedAt,
                null,
                "SERVER_RECORDED",
                "{\"private\":\"must-not-leak\"}"
        ));
        return eventId;
    }

    private Pessoa createPerson(String workspaceId, String angicoId, String email) {
        Pessoa person = new Pessoa(workspaceId, angicoId, "MEMBER", Instant.now());
        person.setEmail(email);
        person.setAngicoId(angicoId);
        person.setNome(angicoId);
        person.setStatus("ATIVA");
        person.setPasswordHash(passwordHasher.hash("correct-password"));
        person = pessoaRepository.save(person);
        memberRepository.save(new WorkspaceMember(
                workspaceId, angicoId, angicoId, "MEMBER", "ACTIVE", Instant.now()));
        return person;
    }

    private Cookie login(Pessoa person) throws Exception {
        MvcResult result = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + person.getEmail()
                                + "\",\"password\":\"correct-password\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return result.getResponse().getCookie("ANGICO_SESSION");
    }
}
