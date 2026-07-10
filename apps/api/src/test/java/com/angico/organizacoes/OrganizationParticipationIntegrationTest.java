package com.angico.organizacoes;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.angico.auth.PasswordHasher;
import com.angico.core.memory.MemoryEventRepository;
import com.angico.core.memory.MemoryObjectRepository;
import com.angico.core.memory.MemoryRelationRepository;
import com.angico.missoes.Missao;
import com.angico.missoes.MissaoRepository;
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
        "spring.datasource.url=jdbc:h2:mem:organization-domain;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "angico.auth.required=true",
        "angico.auth.public-registration=false",
        "angico.auth.cookie-secure=false",
        "angico.seed-demo-leader=false"
})
@AutoConfigureMockMvc
class OrganizationParticipationIntegrationTest {

    private static final AtomicInteger IDS = new AtomicInteger();

    @Autowired private MockMvc mvc;
    @Autowired private PasswordHasher passwordHasher;
    @Autowired private PessoaRepository pessoaRepository;
    @Autowired private WorkspaceRepository workspaceRepository;
    @Autowired private WorkspaceMemberRepository memberRepository;
    @Autowired private MissaoRepository missaoRepository;
    @Autowired private MemoryObjectRepository objectRepository;
    @Autowired private MemoryEventRepository eventRepository;
    @Autowired private MemoryRelationRepository relationRepository;

    private String workspaceA;
    private String workspaceB;
    private Pessoa actor;
    private Pessoa participant;
    private SessionCredentials session;
    private Missao missionA;
    private Missao missionB;

    @BeforeEach
    void setUp() throws Exception {
        int id = IDS.incrementAndGet();
        workspaceA = "org-a-" + id;
        workspaceB = "org-b-" + id;
        workspaceRepository.save(new Workspace(workspaceA, "Org A " + id, null, Instant.now()));
        workspaceRepository.save(new Workspace(workspaceB, "Org B " + id, null, Instant.now()));
        actor = createPerson(workspaceA, "org.actor." + id, "org-actor-" + id + "@example.test", true);
        participant = createPerson(
                workspaceA, "org.participant." + id, "org-participant-" + id + "@example.test", false);
        session = login(actor);
        missionA = mission(workspaceA, "Recuperar a microbacia");
        missionB = mission(workspaceB, "Missão externa");
    }

    @Test
    void createsAndListsAnOrganizationWithAnExplicitMissionLink() throws Exception {
        MvcResult created = mvc.perform(post("/api/organizacoes")
                        .cookie(session.cookie())
                        .header("X-CSRF-Token", session.csrfToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"workspaceId":"%s","nome":"Coletivo da Nascente","tipo":"COLETIVO",
                                 "missaoId":%d,"missionRelation":"CONDUZ"}
                                """.formatted(workspaceA, missionA.getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("ATIVA"))
                .andReturn();
        long organizationId = responseId(created);

        mvc.perform(get("/api/organizacoes")
                        .param("workspaceId", workspaceA)
                        .cookie(session.cookie()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(organizationId));

        assertTrue(relationRepository.existsByWorkspaceIdAndOriginTypeAndOriginIdAndDestinationTypeAndDestinationIdAndRelationTypeAndActiveTrue(
                workspaceA, "ORGANIZACAO", String.valueOf(organizationId), "MISSAO",
                String.valueOf(missionA.getId()), "CONDUZ"));
        assertTrue(eventRepository.findByWorkspaceIdOrderBySequenceAsc(workspaceA).stream()
                .anyMatch(event -> "organizacao.criada".equals(event.getEventType())
                        && actor.getAngicoId().equals(event.getActorId())));
    }

    @Test
    void recordsARealParticipationWithCanonicalPersonOrganizationRelation() throws Exception {
        long organizationId = createOrganization();

        MvcResult created = mvc.perform(post("/api/organizacoes/{id}/participacoes", organizationId)
                        .cookie(session.cookie())
                        .header("X-CSRF-Token", session.csrfToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"workspaceId":"%s","pessoaId":%d,"papel":"REPRESENTACAO",
                                 "status":"ATIVA","startedAt":"2026-07-01T12:00:00Z"}
                                """.formatted(workspaceA, participant.getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.actorId").value(actor.getAngicoId()))
                .andReturn();
        long participationId = responseId(created);

        mvc.perform(get("/api/organizacoes/{id}/participacoes", organizationId)
                        .param("workspaceId", workspaceA)
                        .cookie(session.cookie()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(participationId));

        assertTrue(relationRepository.existsByWorkspaceIdAndOriginTypeAndOriginIdAndDestinationTypeAndDestinationIdAndRelationTypeAndActiveTrue(
                workspaceA, "PESSOA", String.valueOf(participant.getId()), "ORGANIZACAO",
                String.valueOf(organizationId), "PARTICIPA_DE"));
        assertTrue(objectRepository.findByWorkspaceIdAndEntityTypeIgnoreCaseAndEntityId(
                workspaceA, "PARTICIPACAO", String.valueOf(participationId)).size() == 1);
    }

    @Test
    void rejectsCrossWorkspaceMissionAndInvalidParticipationPeriod() throws Exception {
        mvc.perform(post("/api/organizacoes")
                        .cookie(session.cookie())
                        .header("X-CSRF-Token", session.csrfToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"workspaceId":"%s","nome":"Ligação inválida","tipo":"ONG",
                                 "missaoId":%d,"missionRelation":"MOBILIZA"}
                                """.formatted(workspaceA, missionB.getId())))
                .andExpect(status().isForbidden());

        long organizationId = createOrganization();
        mvc.perform(post("/api/organizacoes/{id}/participacoes", organizationId)
                        .cookie(session.cookie())
                        .header("X-CSRF-Token", session.csrfToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"workspaceId":"%s","pessoaId":%d,"papel":"MEMBRO",
                                 "status":"ENCERRADA","startedAt":"2026-07-09T12:00:00Z",
                                 "endedAt":"2026-07-08T12:00:00Z"}
                                """.formatted(workspaceA, participant.getId())))
                .andExpect(status().isBadRequest());
    }

    private long createOrganization() throws Exception {
        MvcResult created = mvc.perform(post("/api/organizacoes")
                        .cookie(session.cookie())
                        .header("X-CSRF-Token", session.csrfToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"workspaceId":"%s","nome":"Associação do Território","tipo":"ASSOCIACAO"}
                                """.formatted(workspaceA)))
                .andExpect(status().isCreated())
                .andReturn();
        return responseId(created);
    }

    private Missao mission(String workspaceId, String title) {
        return missaoRepository.save(new Missao(
                workspaceId, title, null, "ATIVA", 0, null, null, Instant.now()));
    }

    private Pessoa createPerson(
            String workspaceId,
            String angicoId,
            String email,
            boolean withPassword
    ) {
        Pessoa person = new Pessoa(workspaceId, angicoId, "MEMBER", Instant.now());
        person.setEmail(email);
        person.setAngicoId(angicoId);
        person.setStatus("ATIVA");
        if (withPassword) {
            person.setPasswordHash(passwordHasher.hash("correct-password"));
        }
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
