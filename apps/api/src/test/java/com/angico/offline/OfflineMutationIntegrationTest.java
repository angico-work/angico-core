package com.angico.offline;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.reset;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.angico.auth.PasswordHasher;
import com.angico.common.idempotency.IdempotencyRecordRepository;
import com.angico.common.idempotency.IdempotencyOperation;
import com.angico.common.idempotency.IdempotencyService;
import com.angico.core.memory.JpaMemoryGateway;
import com.angico.pessoas.Pessoa;
import com.angico.pessoas.PessoaRepository;
import com.angico.problemas.ProblemaRepository;
import com.angico.territorios.Territorio;
import com.angico.territorios.TerritorioRepository;
import com.angico.workspaces.Workspace;
import com.angico.workspaces.WorkspaceMember;
import com.angico.workspaces.WorkspaceMemberRepository;
import com.angico.workspaces.WorkspaceRepository;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:offline-domain-mutations;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "angico.auth.required=true",
        "angico.auth.public-registration=false",
        "angico.auth.cookie-secure=false",
        "angico.seed-demo-leader=false"
})
@AutoConfigureMockMvc
class OfflineMutationIntegrationTest {

    private static final AtomicInteger IDS = new AtomicInteger();

    @Autowired private MockMvc mvc;
    @Autowired private PasswordHasher passwordHasher;
    @Autowired private PessoaRepository pessoaRepository;
    @Autowired private ProblemaRepository problemaRepository;
    @Autowired private TerritorioRepository territorioRepository;
    @Autowired private IdempotencyRecordRepository idempotencyRepository;

    @MockitoSpyBean
    private IdempotencyService idempotencyService;

    @MockitoSpyBean
    private JpaMemoryGateway memoryGateway;
    @Autowired private WorkspaceRepository workspaceRepository;
    @Autowired private WorkspaceMemberRepository memberRepository;

    private String workspaceId;
    private Pessoa actor;
    private SessionCredentials session;

    @BeforeEach
    void setUp() throws Exception {
        reset(idempotencyService, memoryGateway);
        int id = IDS.incrementAndGet();
        workspaceId = "domain-offline-" + id;
        workspaceRepository.save(new Workspace(workspaceId, "Domain Offline " + id, null, Instant.now()));
        actor = new Pessoa(workspaceId, "Offline Actor " + id, "MEMBER", Instant.now());
        actor.setEmail("domain-offline-" + id + "@example.test");
        actor.setAngicoId("domain.offline." + id);
        actor.setStatus("ATIVA");
        actor.setPasswordHash(passwordHasher.hash("correct-password"));
        actor = pessoaRepository.save(actor);
        memberRepository.save(new WorkspaceMember(
                workspaceId, actor.getAngicoId(), actor.getNome(), "MEMBER", "ACTIVE", Instant.now()));
        session = login(actor);
    }

    @Test
    void sameKeyAndCanonicalPayloadReplayTheOriginalProblem() throws Exception {
        String key = "problem-replay-" + IDS.incrementAndGet();
        String payload = """
                {"workspaceId":"%s","categoria":"AGUA","titulo":"Nascente degradada"}
                """.formatted(workspaceId);

        MvcResult first = postMutation("problemas", key, payload, 201)
                .andExpect(jsonPath("$.operation").value("PROBLEMA_CREATE"))
                .andExpect(jsonPath("$.workspaceId").value(workspaceId))
                .andExpect(jsonPath("$.clientMutationId").value(key))
                .andReturn();
        MvcResult replay = postMutation("problemas", key, """
                {"titulo":"Nascente degradada","categoria":"AGUA","workspaceId":"%s"}
                """.formatted(workspaceId), 201).andReturn();

        assertEquals(receiptResourceId(first), receiptResourceId(replay));
        assertEquals(1, problemaRepository.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId).size());
    }

    @Test
    void sameKeyWithDifferentPayloadReturnsConflictWithoutAnotherProblem() throws Exception {
        String key = "problem-conflict-" + IDS.incrementAndGet();
        postMutation("problemas", key, problemPayload(workspaceId, "Primeiro título"), 201);

        postMutation("problemas", key, problemPayload(workspaceId, "Título diferente"), 409);

        assertEquals(1, problemaRepository.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId).size());
    }

    @Test
    void keyScopeIncludesActorAndWorkspace() throws Exception {
        int id = IDS.incrementAndGet();
        Pessoa secondActor = createPerson(
                workspaceId, "domain.offline.second." + id, "domain-offline-second-" + id + "@example.test");
        SessionCredentials secondSession = login(secondActor);
        String secondWorkspace = "domain-offline-other-" + id;
        workspaceRepository.save(new Workspace(secondWorkspace, "Other " + id, null, Instant.now()));
        memberRepository.save(new WorkspaceMember(
                secondWorkspace, actor.getAngicoId(), actor.getNome(), "MEMBER", "ACTIVE", Instant.now()));
        String key = "scoped-problem-" + id;

        String first = receiptResourceId(postMutation(
                session, "problemas", key, problemPayload(workspaceId, "Escopo"), 201).andReturn());
        String byOtherActor = receiptResourceId(postMutation(
                secondSession, "problemas", key, problemPayload(workspaceId, "Escopo"), 201).andReturn());
        String inOtherWorkspace = receiptResourceId(postMutation(
                session, "problemas", key, problemPayload(secondWorkspace, "Escopo"), 201).andReturn());

        org.junit.jupiter.api.Assertions.assertNotEquals(first, byOtherActor);
        org.junit.jupiter.api.Assertions.assertNotEquals(first, inOtherWorkspace);
    }

    @Test
    void allAllowlistedRoutesCreateReceiptsForConfirmedRemoteIds() throws Exception {
        Territorio territory = createTerritory(workspaceId);
        String problemId = postAndResourceId("problemas", """
                {"workspaceId":"%s","territorioId":"%s","categoria":"AGUA","titulo":"Córrego degradado"}
                """.formatted(workspaceId, territory.getId()), "PROBLEMA_CREATE");
        postAndResourceId("potencialidades", """
                {"workspaceId":"%s","territorioId":"%s","categoria":"AREA_VERDE","titulo":"Horta comunitária"}
                """.formatted(workspaceId, territory.getId()), "POTENCIALIDADE_CREATE");
        String missionId = postAndResourceId("missoes", """
                {"workspaceId":"%s","territorioId":"%s","problemaId":"%s","responsavelId":"%s","titulo":"Recuperar o córrego"}
                """.formatted(workspaceId, territory.getId(), problemId, actor.getId()), "MISSAO_CREATE");
        String actionId = postAndResourceId("acoes", """
                {"workspaceId":"%s","missaoId":"%s","responsavelId":"%s","titulo":"Mutirão de limpeza"}
                """.formatted(workspaceId, missionId, actor.getId()), "ACAO_CREATE");
        String resultId = postAndResourceId("resultados", """
                {"workspaceId":"%s","acaoId":%s,"titulo":"Trecho recuperado"}
                """.formatted(workspaceId, actionId), "RESULTADO_CREATE");
        String indicatorId = postAndResourceId("indicadores", """
                {"workspaceId":"%s","territorioId":%s,"resultadoId":%s,"nome":"Resíduos removidos","unidade":"kg"}
                """.formatted(workspaceId, territory.getId(), resultId), "INDICADOR_CREATE");
        postAndResourceId("medicoes", """
                {"workspaceId":"%s","indicadorId":%s,"valor":42.5,"unidade":"kg","fonte":"balança"}
                """.formatted(workspaceId, indicatorId), "MEDICAO_CREATE");
        String resourceId = postAndResourceId("recursos", """
                {"workspaceId":"%s","nome":"Luvas","categoria":"MATERIAL","unidade":"par"}
                """.formatted(workspaceId), "RECURSO_CREATE");
        postAndResourceId("usos-recursos", """
                {"recursoId":%s,"payload":{"workspaceId":"%s","acaoId":%s,"quantidade":12,"unidade":"par"}}
                """.formatted(resourceId, workspaceId, actionId), "RECURSO_USO_CREATE");
    }

    @Test
    void invalidRemoteReferenceRollsBackTheIdempotencyReservation() throws Exception {
        long recordsBefore = idempotencyRepository.count();

        postMutation("acoes", "invalid-action-" + IDS.incrementAndGet(), """
                {"workspaceId":"%s","missaoId":"999999","responsavelId":"%s","titulo":"Sem missão"}
                """.formatted(workspaceId, actor.getId()), 400);

        assertEquals(recordsBefore, idempotencyRepository.count());
    }

    @Test
    void missingIdempotencyKeyIsRejectedBeforeCreatingDomainData() throws Exception {
        mvc.perform(post("/api/offline/mutations/problemas")
                        .cookie(session.cookie())
                        .header("X-CSRF-Token", session.csrfToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(problemPayload(workspaceId, "Sem chave")))
                .andExpect(status().isBadRequest());

        assertEquals(0, problemaRepository.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId).size());
    }

    @Test
    void concurrentRequestsWithTheSameKeyReturnOneConfirmedProblem() throws Exception {
        String key = "problem-race-" + IDS.incrementAndGet();
        String payload = problemPayload(workspaceId, "Registro concorrente");
        CountDownLatch bothReservations = new CountDownLatch(2);
        doAnswer(invocation -> {
            bothReservations.countDown();
            if (!bothReservations.await(5, TimeUnit.SECONDS)) {
                throw new IllegalStateException("As requisições não alcançaram a reserva juntas.");
            }
            return invocation.callRealMethod();
        }).when(idempotencyService).reserve(
                eq(workspaceId),
                eq(actor.getAngicoId()),
                eq(IdempotencyOperation.PROBLEMA_CREATE),
                eq(key),
                any(String.class)
        );

        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> postMutation("problemas", key, payload, 201).andReturn());
            var second = executor.submit(() -> postMutation("problemas", key, payload, 201).andReturn());

            assertEquals(receiptResourceId(first.get(10, TimeUnit.SECONDS)),
                    receiptResourceId(second.get(10, TimeUnit.SECONDS)));
        }
        assertEquals(1, problemaRepository.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId).size());
    }

    @Test
    void domainMemoryFailureRollsBackEntityAndIdempotencyTogether() throws Exception {
        long recordsBefore = idempotencyRepository.count();
        doThrow(new IllegalStateException("memory unavailable"))
                .when(memoryGateway)
                .appendEvent(any());

        postMutation(
                "problemas",
                "atomic-problem-" + IDS.incrementAndGet(),
                problemPayload(workspaceId, "Não pode persistir parcialmente"),
                500
        );

        assertEquals(0, problemaRepository.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId).size());
        assertEquals(recordsBefore, idempotencyRepository.count());
    }

    @Test
    void routeOutsideTheAllowlistIsNotDispatched() throws Exception {
        postMutation(
                "destino-informado-pelo-cliente",
                "unknown-route-" + IDS.incrementAndGet(),
                problemPayload(workspaceId, "Rota proibida"),
                404
        );

        assertEquals(0, problemaRepository.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId).size());
    }

    private org.springframework.test.web.servlet.ResultActions postMutation(
            String route,
            String key,
            String payload,
            int expectedStatus
    ) throws Exception {
        return postMutation(session, route, key, payload, expectedStatus);
    }

    private org.springframework.test.web.servlet.ResultActions postMutation(
            SessionCredentials credentials,
            String route,
            String key,
            String payload,
            int expectedStatus
    ) throws Exception {
        return mvc.perform(post("/api/offline/mutations/" + route)
                        .cookie(credentials.cookie())
                        .header("X-CSRF-Token", credentials.csrfToken())
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().is(expectedStatus));
    }

    private String postAndResourceId(String route, String payload, String operation) throws Exception {
        String key = route + "-" + IDS.incrementAndGet();
        MvcResult result = postMutation(route, key, payload, 201)
                .andExpect(jsonPath("$.operation").value(operation))
                .andExpect(jsonPath("$.workspaceId").value(workspaceId))
                .andExpect(jsonPath("$.clientMutationId").value(key))
                .andExpect(jsonPath("$.resourceId").isNotEmpty())
                .andReturn();
        return receiptResourceId(result);
    }

    private String problemPayload(String requestedWorkspace, String title) {
        return """
                {"workspaceId":"%s","categoria":"AGUA","titulo":"%s"}
                """.formatted(requestedWorkspace, title);
    }

    private Pessoa createPerson(String requestedWorkspace, String angicoId, String email) {
        Pessoa person = new Pessoa(requestedWorkspace, angicoId, "MEMBER", Instant.now());
        person.setEmail(email);
        person.setAngicoId(angicoId);
        person.setStatus("ATIVA");
        person.setPasswordHash(passwordHasher.hash("correct-password"));
        person = pessoaRepository.save(person);
        memberRepository.save(new WorkspaceMember(
                requestedWorkspace, angicoId, angicoId, "MEMBER", "ACTIVE", Instant.now()));
        return person;
    }

    private Territorio createTerritory(String requestedWorkspace) {
        Territorio territory = new Territorio();
        territory.setWorkspaceId(requestedWorkspace);
        territory.setNome("Bacia local");
        territory.setTipo("BAIRRO");
        territory.setStatus("ATIVO");
        territory.setCreatedAt(Instant.now());
        territory.setUpdatedAt(Instant.now());
        return territorioRepository.save(territory);
    }

    private String receiptResourceId(MvcResult result) throws Exception {
        return com.jayway.jsonpath.JsonPath.read(
                result.getResponse().getContentAsString(), "$.resourceId");
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

    private record SessionCredentials(Cookie cookie, String csrfToken) {
    }
}
