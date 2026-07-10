package com.angico.impacto;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.reset;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.angico.acoes.Acao;
import com.angico.acoes.AcaoRepository;
import com.angico.auth.PasswordHasher;
import com.angico.common.ClockProvider;
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
import java.util.Arrays;
import java.util.List;
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
    private static final Instant FIXED_NOW = Instant.parse("2026-07-10T20:00:00Z");

    @Autowired private MockMvc mvc;
    @Autowired private PasswordHasher passwordHasher;
    @Autowired private PessoaRepository pessoaRepository;
    @Autowired private WorkspaceRepository workspaceRepository;
    @Autowired private WorkspaceMemberRepository memberRepository;
    @Autowired private AcaoRepository acaoRepository;
    @Autowired private TerritorioRepository territorioRepository;
    @Autowired private ResultadoRepository resultadoRepository;
    @Autowired private IndicadorRepository indicadorRepository;
    @Autowired private MedicaoRepository medicaoRepository;
    @Autowired private MemoryEventRepository eventRepository;
    @Autowired private MemoryObjectRepository objectRepository;
    @Autowired private MemoryRelationRepository relationRepository;

    @MockitoSpyBean
    private JpaMemoryGateway memoryGateway;

    @MockitoSpyBean
    private ClockProvider clock;

    private String workspaceA;
    private String workspaceB;
    private Pessoa actor;
    private SessionCredentials session;
    private Acao actionA;
    private Acao actionB;

    @BeforeEach
    void setUp() throws Exception {
        reset(memoryGateway, clock);
        doReturn(FIXED_NOW).when(clock).now();
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

    @Test
    void createsAnAuthoredMeasurementWithClockBasedDefaultsAndCanonicalRelation() throws Exception {
        Indicador indicator = indicator(workspaceA, "Mata ciliar recuperada", "m");

        MvcResult created = mvc.perform(post("/api/medicoes")
                        .cookie(session.cookie())
                        .header("X-CSRF-Token", session.csrfToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"workspaceId":"%s","indicadorId":%d,"valor":18.75,
                                 "unidade":"m","fonte":"Vistoria comunitária",
                                 "actorId":"forged.actor"}
                                """.formatted(workspaceA, indicator.getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.actorId").value(actor.getAngicoId()))
                .andExpect(jsonPath("$.measuredAt").value(FIXED_NOW.toString()))
                .andExpect(jsonPath("$.createdAt").value(FIXED_NOW.toString()))
                .andReturn();
        long measurementId = responseId(created);

        assertTrue(medicaoRepository.findById(measurementId).isPresent());
        assertTrue(relationRepository
                .existsByWorkspaceIdAndOriginTypeAndOriginIdAndDestinationTypeAndDestinationIdAndRelationTypeAndActiveTrue(
                        workspaceA, "MEDICAO", String.valueOf(measurementId),
                        "INDICADOR", String.valueOf(indicator.getId()), "REFERE_SE_A"));
        assertTrue(eventRepository.findByWorkspaceIdOrderBySequenceAsc(workspaceA).stream()
                .anyMatch(event -> "MEDICAO_REGISTRADA".equals(event.getEventType())
                        && String.valueOf(measurementId).equals(event.getEntityId())
                        && actor.getAngicoId().equals(event.getActorId())
                        && FIXED_NOW.equals(event.getOccurredAt())
                        && FIXED_NOW.equals(event.getRecordedAt())));
    }

    @Test
    void rejectsStructurallyInvalidMeasurementPayloads() throws Exception {
        Indicador indicator = indicator(workspaceA, "Qualidade da água", "pH");
        List<String> invalidPayloads = List.of(
                """
                        {"workspaceId":"%s","valor":7.1}
                        """.formatted(workspaceA),
                """
                        {"workspaceId":"%s","indicadorId":%d}
                        """.formatted(workspaceA, indicator.getId()),
                """
                        {"workspaceId":"%s","indicadorId":0,"valor":7.1}
                        """.formatted(workspaceA),
                """
                        {"workspaceId":"%s","indicadorId":%d,"valor":7.1,"unidade":"%s"}
                        """.formatted(workspaceA, indicator.getId(), "u".repeat(41)),
                """
                        {"workspaceId":"%s","indicadorId":%d,"valor":7.1,"fonte":"%s"}
                        """.formatted(workspaceA, indicator.getId(), "f".repeat(256))
        );

        for (String payload : invalidPayloads) {
            mvc.perform(post("/api/medicoes")
                            .cookie(session.cookie())
                            .header("X-CSRF-Token", session.csrfToken())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(payload))
                    .andExpect(status().isBadRequest());
        }

        assertEquals(0, medicaoRepository.countByWorkspaceId(workspaceA));
    }

    @Test
    void rejectsNonFiniteMeasurementValues() throws Exception {
        Indicador indicator = indicator(workspaceA, "Área restaurada", "ha");

        for (String value : List.of("NaN", "Infinity", "-Infinity")) {
            mvc.perform(post("/api/medicoes")
                            .cookie(session.cookie())
                            .header("X-CSRF-Token", session.csrfToken())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"workspaceId":"%s","indicadorId":%d,"valor":"%s"}
                                    """.formatted(workspaceA, indicator.getId(), value)))
                    .andExpect(status().isBadRequest());
        }

        assertEquals(0, medicaoRepository.countByWorkspaceId(workspaceA));
    }

    @Test
    void rejectsMeasurementTimesOutsideTheOperationalWindow() throws Exception {
        Indicador indicator = indicator(workspaceA, "Cobertura vegetal", "%");

        for (String measuredAt : List.of(
                "1999-12-31T23:59:59Z",
                FIXED_NOW.plusSeconds(301).toString())) {
            mvc.perform(post("/api/medicoes")
                            .cookie(session.cookie())
                            .header("X-CSRF-Token", session.csrfToken())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"workspaceId":"%s","indicadorId":%d,"valor":42.0,
                                     "measuredAt":"%s"}
                                    """.formatted(workspaceA, indicator.getId(), measuredAt)))
                    .andExpect(status().isBadRequest());
        }

        assertEquals(0, medicaoRepository.countByWorkspaceId(workspaceA));
    }

    @Test
    void measurementRequestDoesNotExposeAnActorOverride() {
        assertTrue(Arrays.stream(MedicaoRequest.class.getRecordComponents())
                .noneMatch(component -> "actorId".equals(component.getName())));
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

    private Indicador indicator(String workspaceId, String name, String unit) {
        Indicador indicator = new Indicador();
        indicator.setWorkspaceId(workspaceId);
        indicator.setNome(name);
        indicator.setUnidade(unit);
        indicator.setStatus("ATIVO");
        indicator.setCreatedAt(FIXED_NOW);
        indicator.setUpdatedAt(FIXED_NOW);
        return indicadorRepository.save(indicator);
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
