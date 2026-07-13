package com.angico.observacoes;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.reset;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.angico.auth.PasswordHasher;
import com.angico.core.memory.JpaMemoryGateway;
import com.angico.core.memory.MemoryEventRepository;
import com.angico.core.memory.MemoryObjectRepository;
import com.angico.core.memory.MemoryRelationRepository;
import com.angico.core.memory.StoredMemoryEvent;
import com.angico.pessoas.Pessoa;
import com.angico.pessoas.PessoaRepository;
import com.angico.workspaces.Workspace;
import com.angico.workspaces.WorkspaceMember;
import com.angico.workspaces.WorkspaceMemberRepository;
import com.angico.workspaces.WorkspaceRepository;
import jakarta.servlet.http.Cookie;
import java.sql.SQLException;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicInteger;
import javax.sql.DataSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:observation-offline;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "angico.auth.required=true",
        "angico.auth.public-registration=false",
        "angico.auth.cookie-secure=false",
        "angico.seed-demo-leader=false"
})
@AutoConfigureMockMvc
class ObservationOfflineIdempotencyIntegrationTest {

    private static final AtomicInteger IDS = new AtomicInteger();

    @Autowired private MockMvc mvc;
    @Autowired private PasswordHasher passwordHasher;
    @Autowired private PessoaRepository pessoaRepository;
    @Autowired private WorkspaceRepository workspaceRepository;
    @Autowired private WorkspaceMemberRepository memberRepository;
    @Autowired private ObservacaoRepository observacaoRepository;
    @Autowired private MemoryEventRepository memoryEventRepository;
    @Autowired private MemoryObjectRepository memoryObjectRepository;
    @Autowired private MemoryRelationRepository memoryRelationRepository;
    @Autowired private DataSource dataSource;

    @MockitoSpyBean
    private JpaMemoryGateway memoryGateway;

    private String workspaceA;
    private String workspaceB;
    private Pessoa actorA;
    private Pessoa actorB;
    private SessionCredentials sessionA;
    private SessionCredentials sessionB;

    @BeforeEach
    void setUp() throws Exception {
        reset(memoryGateway);
        int id = IDS.incrementAndGet();
        workspaceA = "offline-a-" + id;
        workspaceB = "offline-b-" + id;
        workspaceRepository.save(new Workspace(workspaceA, "Offline A " + id, null, Instant.now()));
        workspaceRepository.save(new Workspace(workspaceB, "Offline B " + id, null, Instant.now()));
        actorA = createPerson(workspaceA, "offline.actor.a." + id, "offline-a-" + id + "@example.test");
        actorB = createPerson(workspaceA, "offline.actor.b." + id, "offline-b-" + id + "@example.test");
        memberRepository.save(new WorkspaceMember(
                workspaceB, actorA.getAngicoId(), actorA.getNome(), "MEMBER", "ACTIVE", Instant.now()));
        sessionA = login(actorA);
        sessionB = login(actorB);
    }

    @Test
    void sameKeyAndCanonicalPayloadReplayTheOriginalObservation() throws Exception {
        String key = "obs-replay-" + IDS.incrementAndGet();
        long idempotencyRecordsBefore = Math.max(0, countRows("idempotency_record"));

        MvcResult first = postObservation(sessionA, key, """
                {
                  "workspaceId":"%s",
                  "categoria":"AMBIENTE",
                  "titulo":"Nascente observada",
                  "descricao":"Água turva",
                  "urgencia":"ALTA"
                }
                """.formatted(workspaceA), 201);
        MvcResult replay = postObservation(sessionA, key, """
                {
                  "urgencia":"ALTA",
                  "descricao":"Água turva",
                  "titulo":"Nascente observada",
                  "categoria":"AMBIENTE",
                  "workspaceId":"%s"
                }
                """.formatted(workspaceA), 201);

        assertEquals(responseId(first), responseId(replay));
        assertEquals(1, observacaoRepository.findByWorkspaceIdOrderByCreatedAtDesc(workspaceA).size());
        assertEquals(idempotencyRecordsBefore + 1, countRows("idempotency_record"));
    }

    @Test
    void sameKeyWithDifferentPayloadReturnsConflict() throws Exception {
        String key = "obs-conflict-" + IDS.incrementAndGet();
        postObservation(sessionA, key, basePayload(workspaceA, "Primeiro título"), 201);

        postObservation(sessionA, key, basePayload(workspaceA, "Outro título"), 409)
                .getResponse();

        assertEquals(1, observacaoRepository.findByWorkspaceIdOrderByCreatedAtDesc(workspaceA).size());
    }

    @Test
    void keyScopeIncludesCanonicalActorAndWorkspace() throws Exception {
        String key = "obs-scope-" + IDS.incrementAndGet();
        long idempotencyRecordsBefore = Math.max(0, countRows("idempotency_record"));

        long actorAWorkspaceA = responseId(postObservation(
                sessionA, key, basePayload(workspaceA, "Registro isolado"), 201));
        long actorBWorkspaceA = responseId(postObservation(
                sessionB, key, basePayload(workspaceA, "Registro isolado"), 201));
        long actorAWorkspaceB = responseId(postObservation(
                sessionA, key, basePayload(workspaceB, "Registro isolado"), 201));

        assertNotEquals(actorAWorkspaceA, actorBWorkspaceA);
        assertNotEquals(actorAWorkspaceA, actorAWorkspaceB);
        assertEquals(idempotencyRecordsBefore + 3, countRows("idempotency_record"));
        assertEquals(3, countRows(
                "idempotency_record",
                "idempotency_key = '" + key + "'"));
        assertEquals(2, countDistinct(
                "idempotency_record", "actor_id", "idempotency_key = '" + key + "'"));
        assertEquals(2, countDistinct(
                "idempotency_record", "workspace_id", "idempotency_key = '" + key + "'"));
    }

    @Test
    void offlineMetadataReachesDomainResponseMemoryAndIdempotencyRecord() throws Exception {
        String key = "obs-offline-" + IDS.incrementAndGet();
        String clientMutationId = "mutation-" + IDS.incrementAndGet();
        Instant occurredAt = Instant.parse("2026-07-09T18:42:00Z");

        MvcResult result = postObservation(sessionA, key, """
                {
                  "workspaceId":"%s",
                  "categoria":"AGUA",
                  "titulo":"Registro feito em campo",
                  "clientMutationId":"%s",
                  "occurredAt":"%s",
                  "deviceId":"field-phone-7"
                }
                """.formatted(workspaceA, clientMutationId, occurredAt), 201);
        long observationId = responseId(result);
        assertTrue(result.getResponse().getContentAsString().contains(clientMutationId));

        var saved = observacaoRepository.findById(observationId).orElseThrow();
        assertEquals(clientMutationId, saved.getClientMutationId());
        assertEquals(occurredAt, saved.getOccurredAt());
        assertEquals("field-phone-7", saved.getDeviceId());

        StoredMemoryEvent event = memoryEventRepository
                .findByWorkspaceIdOrderBySequenceAsc(workspaceA)
                .stream()
                .filter(candidate -> "observacao.registrada".equals(candidate.getEventType()))
                .filter(candidate -> String.valueOf(observationId).equals(candidate.getEntityId()))
                .findFirst()
                .orElseThrow();
        assertEquals(actorA.getAngicoId(), event.getActorId());
        assertEquals("field-phone-7", event.getDeviceId());
        assertEquals(key, event.getIdempotencyKey());
        assertEquals("SYNCED_FROM_OFFLINE", event.getSyncStatus());
        assertEquals(occurredAt, event.getOccurredAt());

        assertEquals("OBSERVACAO_CREATE", scalarString(
                "SELECT operation_kind FROM idempotency_record WHERE resource_id = ?",
                String.valueOf(observationId)));
        assertEquals("201", scalarString(
                "SELECT response_status FROM idempotency_record WHERE resource_id = ?",
                String.valueOf(observationId)));
    }

    @Test
    void clientMutationIdIsUniqueInsideAWorkspace() throws Exception {
        String mutation = "shared-mutation-" + IDS.incrementAndGet();
        postObservation(sessionA, "first-" + mutation, offlinePayload(workspaceA, mutation), 201);

        postObservation(sessionB, "second-" + mutation, offlinePayload(workspaceA, mutation), 409);
        postObservation(sessionA, "other-workspace-" + mutation, offlinePayload(workspaceB, mutation), 201);

        assertEquals(1, observacaoRepository.findByWorkspaceIdOrderByCreatedAtDesc(workspaceA).size());
        assertEquals(1, observacaoRepository.findByWorkspaceIdOrderByCreatedAtDesc(workspaceB).size());
    }

    @Test
    void memoryFailureRollsBackObservationAndIdempotencyReservation() throws Exception {
        long observationsBefore = observacaoRepository.count();
        long eventsBefore = memoryEventRepository.count();
        long objectsBefore = memoryObjectRepository.count();
        long relationsBefore = memoryRelationRepository.count();
        long idempotencyRecordsBefore = countRows("idempotency_record");
        doThrow(new IllegalStateException("memory unavailable"))
                .when(memoryGateway)
                .appendEvent(any());

        postObservation(
                sessionA,
                "atomic-" + IDS.incrementAndGet(),
                basePayload(workspaceA, "Não pode persistir parcialmente"),
                500);

        assertEquals(observationsBefore, observacaoRepository.count());
        assertEquals(eventsBefore, memoryEventRepository.count());
        assertEquals(objectsBefore, memoryObjectRepository.count());
        assertEquals(relationsBefore, memoryRelationRepository.count());
        assertEquals(idempotencyRecordsBefore, countRows("idempotency_record"));
    }

    @Test
    void unsafeOrOversizedIdempotencyKeysAreRejected() throws Exception {
        postObservation(sessionA, "unsafe key", basePayload(workspaceA, "Inválido"), 400);
        postObservation(sessionA, "x".repeat(129), basePayload(workspaceA, "Muito longo"), 400);

        assertEquals(0, observacaoRepository.findByWorkspaceIdOrderByCreatedAtDesc(workspaceA).size());
    }

    private MvcResult postObservation(
            SessionCredentials session,
            String idempotencyKey,
            String payload,
            int expectedStatus
    ) throws Exception {
        return mvc.perform(post("/api/observacoes")
                        .cookie(session.cookie())
                        .header("X-CSRF-Token", session.csrfToken())
                        .header("Idempotency-Key", idempotencyKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().is(expectedStatus))
                .andReturn();
    }

    private String basePayload(String workspaceId, String title) {
        return """
                {"workspaceId":"%s","categoria":"AMBIENTE","titulo":"%s"}
                """.formatted(workspaceId, title);
    }

    private String offlinePayload(String workspaceId, String mutation) {
        return """
                {
                  "workspaceId":"%s",
                  "categoria":"AMBIENTE",
                  "titulo":"Registro offline",
                  "clientMutationId":"%s",
                  "occurredAt":"2026-07-09T18:42:00Z",
                  "deviceId":"field-phone"
                }
                """.formatted(workspaceId, mutation);
    }

    private long responseId(MvcResult result) throws Exception {
        return ((Number) com.jayway.jsonpath.JsonPath.read(
                result.getResponse().getContentAsString(), "$.id")).longValue();
    }

    private Pessoa createPerson(String workspaceId, String angicoId, String email) {
        Pessoa pessoa = new Pessoa(workspaceId, angicoId, "MEMBER", Instant.now());
        pessoa.setEmail(email);
        pessoa.setAngicoId(angicoId);
        pessoa.setStatus("ATIVA");
        pessoa.setPasswordHash(passwordHasher.hash("correct-password"));
        pessoa = pessoaRepository.save(pessoa);
        memberRepository.save(new WorkspaceMember(
                workspaceId, angicoId, angicoId, "MEMBER", "ACTIVE", Instant.now()));
        return pessoa;
    }

    private SessionCredentials login(Pessoa pessoa) throws Exception {
        MvcResult result = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + pessoa.getEmail()
                                + "\",\"password\":\"correct-password\"}"))
                .andExpect(status().isOk())
                .andReturn();
        Cookie cookie = result.getResponse().getCookie("ANGICO_SESSION");
        String csrfToken = com.jayway.jsonpath.JsonPath.read(
                result.getResponse().getContentAsString(), "$.csrfToken");
        return new SessionCredentials(cookie, csrfToken);
    }

    private long countRows(String tableName) throws SQLException {
        try (var connection = dataSource.getConnection()) {
            try (var tables = connection.getMetaData().getTables(null, null, tableName.toUpperCase(), null)) {
                if (!tables.next()) {
                    return -1;
                }
            }
            try (var statement = connection.createStatement();
                    var result = statement.executeQuery("SELECT COUNT(*) FROM " + tableName)) {
                result.next();
                return result.getLong(1);
            }
        }
    }

    private long countRows(String tableName, String condition) throws SQLException {
        try (var connection = dataSource.getConnection();
                var statement = connection.createStatement();
                var result = statement.executeQuery(
                        "SELECT COUNT(*) FROM " + tableName + " WHERE " + condition)) {
            result.next();
            return result.getLong(1);
        }
    }

    private long countDistinct(String tableName, String columnName, String condition) throws SQLException {
        try (var connection = dataSource.getConnection();
                var statement = connection.createStatement();
                var result = statement.executeQuery(
                        "SELECT COUNT(DISTINCT " + columnName + ") FROM " + tableName
                                + " WHERE " + condition)) {
            result.next();
            return result.getLong(1);
        }
    }

    private String scalarString(String sql, String argument) throws SQLException {
        try (var connection = dataSource.getConnection();
                var statement = connection.prepareStatement(sql)) {
            statement.setString(1, argument);
            try (var result = statement.executeQuery()) {
                result.next();
                return result.getString(1);
            }
        }
    }

    private record SessionCredentials(Cookie cookie, String csrfToken) {
    }
}
