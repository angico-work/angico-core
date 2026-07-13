package com.angico.recursos;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.angico.acoes.Acao;
import com.angico.acoes.AcaoRepository;
import com.angico.auth.PasswordHasher;
import com.angico.core.memory.MemoryEventRepository;
import com.angico.core.memory.MemoryRelationRepository;
import com.angico.pessoas.Pessoa;
import com.angico.pessoas.PessoaRepository;
import com.angico.workspaces.Workspace;
import com.angico.workspaces.WorkspaceMember;
import com.angico.workspaces.WorkspaceMemberRepository;
import com.angico.workspaces.WorkspaceRepository;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
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
        "spring.datasource.url=jdbc:h2:mem:resource-domain;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "angico.auth.required=true",
        "angico.auth.public-registration=false",
        "angico.auth.cookie-secure=false",
        "angico.seed-demo-leader=false"
})
@AutoConfigureMockMvc
class ResourceUsageIntegrationTest {

    private static final AtomicInteger IDS = new AtomicInteger();

    @Autowired private MockMvc mvc;
    @Autowired private PasswordHasher passwordHasher;
    @Autowired private PessoaRepository pessoaRepository;
    @Autowired private WorkspaceRepository workspaceRepository;
    @Autowired private WorkspaceMemberRepository memberRepository;
    @Autowired private AcaoRepository acaoRepository;
    @Autowired private MemoryEventRepository eventRepository;
    @Autowired private MemoryRelationRepository relationRepository;

    private String workspaceA;
    private String workspaceB;
    private Pessoa actor;
    private SessionCredentials session;
    private Acao actionA;
    private Acao actionB;

    @BeforeEach
    void setUp() throws Exception {
        int id = IDS.incrementAndGet();
        workspaceA = "resource-a-" + id;
        workspaceB = "resource-b-" + id;
        workspaceRepository.save(new Workspace(workspaceA, "Resource A " + id, null, Instant.now()));
        workspaceRepository.save(new Workspace(workspaceB, "Resource B " + id, null, Instant.now()));
        actor = createPerson(workspaceA, "resource.actor." + id, "resource-" + id + "@example.test");
        session = login(actor);
        actionA = action(workspaceA, "Plantio comunitário");
        actionB = action(workspaceB, "Ação externa");
    }

    @Test
    void createsListsAndRecordsExplicitResourceUsageByAnAction() throws Exception {
        MvcResult created = mvc.perform(post("/api/recursos")
                        .cookie(session.cookie())
                        .header("X-CSRF-Token", session.csrfToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"workspaceId":"%s","nome":"Mudas nativas","categoria":"MATERIAL",
                                 "unidade":"unidade","descricao":"Produção do viveiro comunitário"}
                                """.formatted(workspaceA)))
                .andExpect(status().isCreated())
                .andReturn();
        long resourceId = responseId(created);

        mvc.perform(get("/api/recursos")
                        .param("workspaceId", workspaceA)
                        .cookie(session.cookie()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(resourceId));

        MvcResult usage = mvc.perform(post("/api/recursos/{id}/usos", resourceId)
                        .cookie(session.cookie())
                        .header("X-CSRF-Token", session.csrfToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"workspaceId":"%s","acaoId":%d,"quantidade":120.5,
                                 "unidade":"unidade","occurredAt":"2026-07-09T18:42:00Z"}
                                """.formatted(workspaceA, actionA.getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.actorId").value(actor.getAngicoId()))
                .andReturn();
        long usageId = responseId(usage);

        assertTrue(relationRepository.existsByWorkspaceIdAndOriginTypeAndOriginIdAndDestinationTypeAndDestinationIdAndRelationTypeAndActiveTrue(
                workspaceA, "ACAO", String.valueOf(actionA.getId()), "RECURSO",
                String.valueOf(resourceId), "UTILIZA"));
        assertTrue(eventRepository.findByWorkspaceIdOrderBySequenceAsc(workspaceA).stream()
                .anyMatch(event -> "recurso.utilizado".equals(event.getEventType())
                        && String.valueOf(usageId).equals(event.getEntityId())));
    }

    @Test
    void rejectsCrossWorkspaceActionAndMismatchedUnits() throws Exception {
        long resourceId = createResource();

        useResource(resourceId, actionB.getId(), "unidade", "1", 403);
        useResource(resourceId, actionA.getId(), "kg", "1", 400);
        useResource(resourceId, actionA.getId(), "unidade", "0", 400);
    }

    private long createResource() throws Exception {
        MvcResult created = mvc.perform(post("/api/recursos")
                        .cookie(session.cookie())
                        .header("X-CSRF-Token", session.csrfToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"workspaceId":"%s","nome":"Ferramentas","categoria":"EQUIPAMENTO",
                                 "unidade":"unidade"}
                                """.formatted(workspaceA)))
                .andExpect(status().isCreated())
                .andReturn();
        return responseId(created);
    }

    private void useResource(
            long resourceId,
            long actionId,
            String unit,
            String quantity,
            int expectedStatus
    ) throws Exception {
        mvc.perform(post("/api/recursos/{id}/usos", resourceId)
                        .cookie(session.cookie())
                        .header("X-CSRF-Token", session.csrfToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"workspaceId":"%s","acaoId":%d,"quantidade":%s,"unidade":"%s"}
                                """.formatted(workspaceA, actionId, quantity, unit)))
                .andExpect(status().is(expectedStatus));
    }

    private Acao action(String workspaceId, String title) {
        return acaoRepository.save(new Acao(
                workspaceId, title, null, "EM_ANDAMENTO", null, null, Instant.now()));
    }

    private Pessoa createPerson(String workspaceId, String angicoId, String email) {
        Pessoa person = new Pessoa(workspaceId, angicoId, "MEMBER", Instant.now());
        person.setEmail(email);
        person.setAngicoId(angicoId);
        person.setStatus("ATIVA");
        person.setPasswordHash(passwordHasher.hash("correct-password"));
        person = pessoaRepository.save(person);
        memberRepository.save(new WorkspaceMember(
                workspaceId, angicoId, angicoId, "MEMBER", "ACTIVE", Instant.now()));
        return person;
    }

    private SessionCredentials login(Pessoa person) throws Exception {
        MvcResult result = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + person.getEmail()
                                + "\",\"password\":\"correct-password\"}"))
                .andExpect(status().isOk())
                .andReturn();
        Cookie cookie = result.getResponse().getCookie("ANGICO_SESSION");
        String csrfToken = com.jayway.jsonpath.JsonPath.read(
                result.getResponse().getContentAsString(), "$.csrfToken");
        return new SessionCredentials(cookie, csrfToken);
    }

    private long responseId(MvcResult result) throws Exception {
        return ((Number) com.jayway.jsonpath.JsonPath.read(
                result.getResponse().getContentAsString(), "$.id")).longValue();
    }

    private record SessionCredentials(Cookie cookie, String csrfToken) {
    }
}
