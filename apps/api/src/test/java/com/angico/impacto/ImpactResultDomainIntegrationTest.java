package com.angico.impacto;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.reset;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.angico.acoes.Acao;
import com.angico.acoes.AcaoRepository;
import com.angico.auth.PasswordHasher;
import com.angico.core.memory.JpaMemoryGateway;
import com.angico.core.memory.MemoryEventRepository;
import com.angico.core.memory.MemoryObjectRepository;
import com.angico.core.memory.MemoryRelationRepository;
import com.angico.pessoas.Pessoa;
import com.angico.pessoas.PessoaRepository;
import com.angico.territorios.Territorio;
import com.angico.territorios.TerritorioRepository;
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
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:impact-result-domain;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "angico.auth.required=true",
        "angico.auth.public-registration=false",
        "angico.auth.cookie-secure=false",
        "angico.seed-demo-leader=false"
})
@AutoConfigureMockMvc
class ImpactResultDomainIntegrationTest {

    private static final AtomicInteger IDS = new AtomicInteger();

    @Autowired private MockMvc mvc;
    @Autowired private PasswordHasher passwordHasher;
    @Autowired private PessoaRepository pessoaRepository;
    @Autowired private WorkspaceRepository workspaceRepository;
    @Autowired private WorkspaceMemberRepository memberRepository;
    @Autowired private AcaoRepository acaoRepository;
    @Autowired private TerritorioRepository territorioRepository;
    @Autowired private ResultadoRepository resultadoRepository;
    @Autowired private IndicadorRepository indicadorRepository;
    @Autowired private MemoryEventRepository eventRepository;
    @Autowired private MemoryObjectRepository objectRepository;
    @Autowired private MemoryRelationRepository relationRepository;

    @MockitoSpyBean
    private JpaMemoryGateway memoryGateway;

    private String workspaceA;
    private String workspaceB;
    private Pessoa actor;
    private SessionCredentials session;
    private Acao actionA;
    private Acao actionB;

    @BeforeEach
    void setUp() throws Exception {
        reset(memoryGateway);
        int id = IDS.incrementAndGet();
        workspaceA = "result-a-" + id;
        workspaceB = "result-b-" + id;
        workspaceRepository.save(new Workspace(workspaceA, "Result A " + id, null, Instant.now()));
        workspaceRepository.save(new Workspace(workspaceB, "Result B " + id, null, Instant.now()));
        actor = createPerson(workspaceA, "result.actor." + id, "result-" + id + "@example.test");
        session = login(actor);
        actionA = action(workspaceA, "Mutirão concluído");
        actionB = action(workspaceB, "Ação externa");
    }

    @Test
    void createsAndListsAResultLinkedToAnAuthorizedAction() throws Exception {
        MvcResult created = mvc.perform(post("/api/resultados")
                        .cookie(session.cookie())
                        .header("X-CSRF-Token", session.csrfToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "workspaceId":"%s",
                                  "acaoId":%d,
                                  "titulo":"Nascente protegida",
                                  "descricao":"Cercamento comunitário finalizado",
                                  "occurredAt":"2026-07-09T18:42:00Z"
                                }
                                """.formatted(workspaceA, actionA.getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.actorId").value(actor.getAngicoId()))
                .andExpect(jsonPath("$.status").value("REGISTRADO"))
                .andReturn();
        long resultId = responseId(created);

        mvc.perform(get("/api/resultados")
                        .param("workspaceId", workspaceA)
                        .param("acaoId", String.valueOf(actionA.getId()))
                        .cookie(session.cookie()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(resultId));

        assertEquals(1, objectRepository.findByWorkspaceIdAndEntityTypeIgnoreCaseAndEntityId(
                workspaceA, "RESULTADO", String.valueOf(resultId)).size());
        assertTrue(eventRepository.findByWorkspaceIdOrderBySequenceAsc(workspaceA).stream()
                .anyMatch(event -> "resultado.registrado".equals(event.getEventType())
                        && actor.getAngicoId().equals(event.getActorId())));
        assertTrue(relationRepository.existsByWorkspaceIdAndOriginTypeAndOriginIdAndDestinationTypeAndDestinationIdAndRelationTypeAndActiveTrue(
                workspaceA, "ACAO", String.valueOf(actionA.getId()), "RESULTADO",
                String.valueOf(resultId), "PRODUZ"));
    }

    @Test
    void rejectsCrossWorkspaceActionAndRollsBackOnMemoryFailure() throws Exception {
        mvc.perform(post("/api/resultados")
                        .cookie(session.cookie())
                        .header("X-CSRF-Token", session.csrfToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(resultPayload(workspaceA, actionB.getId(), "Resultado externo")))
                .andExpect(status().isForbidden());

        long before = resultadoRepository.count();
        doThrow(new IllegalStateException("memory unavailable")).when(memoryGateway).appendEvent(any());
        mvc.perform(post("/api/resultados")
                        .cookie(session.cookie())
                        .header("X-CSRF-Token", session.csrfToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(resultPayload(workspaceA, actionA.getId(), "Resultado parcial")))
                .andExpect(status().isInternalServerError());
        assertEquals(before, resultadoRepository.count());
    }

    @Test
    void indicatorCreationRecordsItsEventAndMeasuresTheSelectedResult() throws Exception {
        Resultado result = new Resultado();
        result.setWorkspaceId(workspaceA);
        result.setAcaoId(actionA.getId());
        result.setTitulo("Resultado medido");
        result.setDescricao("Base do indicador");
        result.setStatus("REGISTRADO");
        result.setActorId(actor.getAngicoId());
        result.setOccurredAt(Instant.now());
        result.setCreatedAt(Instant.now());
        result = resultadoRepository.save(result);
        Territorio territory = territory(workspaceA, "Microbacia");

        MvcResult created = mvc.perform(post("/api/indicadores")
                        .cookie(session.cookie())
                        .header("X-CSRF-Token", session.csrfToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"workspaceId":"%s","territorioId":%d,"resultadoId":%d,
                                 "nome":"Metros de margem protegida","unidade":"m"}
                                """.formatted(workspaceA, territory.getId(), result.getId())))
                .andExpect(status().isCreated())
                .andReturn();
        long indicatorId = responseId(created);

        assertEquals(1, objectRepository.findByWorkspaceIdAndEntityTypeIgnoreCaseAndEntityId(
                workspaceA, "INDICADOR", String.valueOf(indicatorId)).size());
        assertTrue(eventRepository.findByWorkspaceIdOrderBySequenceAsc(workspaceA).stream()
                .anyMatch(event -> "indicador.criado".equals(event.getEventType())
                        && actor.getAngicoId().equals(event.getActorId())));
        assertTrue(relationRepository.existsByWorkspaceIdAndOriginTypeAndOriginIdAndDestinationTypeAndDestinationIdAndRelationTypeAndActiveTrue(
                workspaceA, "INDICADOR", String.valueOf(indicatorId), "RESULTADO",
                String.valueOf(result.getId()), "MEDE"));
    }

    private String resultPayload(String workspaceId, Long actionId, String title) {
        return """
                {"workspaceId":"%s","acaoId":%d,"titulo":"%s"}
                """.formatted(workspaceId, actionId, title);
    }

    private Acao action(String workspaceId, String title) {
        return acaoRepository.save(new Acao(
                workspaceId, title, null, "CONCLUIDA", null, null, Instant.now()));
    }

    private Territorio territory(String workspaceId, String name) {
        Territorio territory = new Territorio();
        territory.setWorkspaceId(workspaceId);
        territory.setNome(name);
        territory.setStatus("ATIVO");
        territory.setCreatedAt(Instant.now());
        territory.setUpdatedAt(Instant.now());
        return territorioRepository.save(territory);
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
