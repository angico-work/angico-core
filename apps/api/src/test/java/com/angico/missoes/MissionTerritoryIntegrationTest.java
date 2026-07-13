package com.angico.missoes;

import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.angico.auth.PasswordHasher;
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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:mission-territory;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "angico.auth.required=true",
        "angico.auth.public-registration=false",
        "angico.auth.cookie-secure=false",
        "angico.seed-demo-leader=false"
})
@AutoConfigureMockMvc
class MissionTerritoryIntegrationTest {

    private static final AtomicInteger IDS = new AtomicInteger();

    @Autowired private MockMvc mvc;
    @Autowired private PasswordHasher passwordHasher;
    @Autowired private PessoaRepository pessoaRepository;
    @Autowired private WorkspaceRepository workspaceRepository;
    @Autowired private WorkspaceMemberRepository memberRepository;
    @Autowired private MemoryRelationRepository relationRepository;
    @Autowired private TerritorioRepository territorioRepository;
    @Autowired private MissaoRepository missaoRepository;

    private String workspaceId;
    private SessionCredentials session;
    private Territorio territory;
    private Territorio foreignTerritory;

    @BeforeEach
    void setUp() throws Exception {
        int id = IDS.incrementAndGet();
        workspaceId = "mission-territory-" + id;
        workspaceRepository.save(new Workspace(
                workspaceId, "Mission territory " + id, null, Instant.now()));
        Pessoa actor = createPerson(
                workspaceId, "mission.actor." + id, "mission-actor-" + id + "@example.test");
        session = login(actor);
        territory = createTerritory(workspaceId, "Território da missão " + id);
        String foreignWorkspace = "mission-territory-foreign-" + id;
        workspaceRepository.save(new Workspace(
                foreignWorkspace, "Foreign mission territory " + id, null, Instant.now()));
        foreignTerritory = createTerritory(foreignWorkspace, "Território externo " + id);
    }

    @Test
    void keepsTerritoryOptionalWithoutInventingAnOperationalRelation() throws Exception {
        MvcResult created = mvc.perform(post("/api/missoes")
                        .cookie(session.cookie())
                        .header("X-CSRF-Token", session.csrfToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"workspaceId":"%s","titulo":"Missão sem território"}
                                """.formatted(workspaceId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.territorioId").value(nullValue()))
                .andReturn();
        long missionId = responseId(created);

        mvc.perform(get("/api/missoes")
                        .param("workspaceId", workspaceId)
                        .cookie(session.cookie()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(missionId))
                .andExpect(jsonPath("$[0].territorioId").value(nullValue()));

        assertTrue(relationRepository.findActiveRelationsFromOrigin(
                        workspaceId, "MISSAO", String.valueOf(missionId), "ATUA_EM")
                .isEmpty());
    }

    @Test
    void persistsListsAndPublishesAnExplicitMissionTerritory() throws Exception {
        MvcResult created = mvc.perform(post("/api/missoes")
                        .cookie(session.cookie())
                        .header("X-CSRF-Token", session.csrfToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"workspaceId":"%s","territorioId":"%s",\
                                 "titulo":"Recuperar a nascente"}
                                """.formatted(workspaceId, territory.getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.territorioId").value(String.valueOf(territory.getId())))
                .andReturn();
        long missionId = responseId(created);

        mvc.perform(get("/api/missoes")
                        .param("workspaceId", workspaceId)
                        .cookie(session.cookie()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(missionId))
                .andExpect(jsonPath("$[0].territorioId").value(String.valueOf(territory.getId())));

        assertTrue(relationRepository
                .existsByWorkspaceIdAndOriginTypeAndOriginIdAndDestinationTypeAndDestinationIdAndRelationTypeAndActiveTrue(
                        workspaceId, "MISSAO", String.valueOf(missionId),
                        "TERRITORIO", String.valueOf(territory.getId()), "ATUA_EM"));
    }

    @Test
    void rejectsUnresolvableTerritoryReferencesBeforeSavingTheMission() throws Exception {
        assertRejectedTerritory("invalid-id", 400);
        assertRejectedTerritory("999999999", 400);
        assertRejectedTerritory(String.valueOf(foreignTerritory.getId()), 403);

        assertEquals(0, missaoRepository.countByWorkspaceId(workspaceId));
        assertTrue(relationRepository.findByWorkspaceId(workspaceId).stream()
                .noneMatch(relation -> "ATUA_EM".equals(relation.getRelationType())));
    }

    private void assertRejectedTerritory(String territoryId, int expectedStatus) throws Exception {
        mvc.perform(post("/api/missoes")
                        .cookie(session.cookie())
                        .header("X-CSRF-Token", session.csrfToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"workspaceId":"%s","territorioId":"%s",\
                                 "titulo":"Missão inválida"}
                                """.formatted(workspaceId, territoryId)))
                .andExpect(status().is(expectedStatus));
    }

    private Territorio createTerritory(String workspace, String name) {
        Territorio created = new Territorio();
        created.setWorkspaceId(workspace);
        created.setNome(name);
        created.setStatus("ATIVO");
        created.setCreatedAt(Instant.now());
        created.setUpdatedAt(Instant.now());
        return territorioRepository.save(created);
    }

    private Pessoa createPerson(String workspace, String angicoId, String email) {
        Pessoa person = new Pessoa(workspace, angicoId, "MEMBER", Instant.now());
        person.setEmail(email);
        person.setAngicoId(angicoId);
        person.setStatus("ATIVA");
        person.setPasswordHash(passwordHasher.hash("correct-password"));
        person = pessoaRepository.save(person);
        memberRepository.save(new WorkspaceMember(
                workspace, angicoId, angicoId, "MEMBER", "ACTIVE", Instant.now()));
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
