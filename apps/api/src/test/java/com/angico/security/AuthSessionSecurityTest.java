package com.angico.security;

import static org.hamcrest.Matchers.blankOrNullString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import com.angico.auth.PasswordHasher;
import com.angico.auth.AuthSessionRepository;
import com.angico.pessoas.Pessoa;
import com.angico.pessoas.PessoaRepository;
import com.angico.workspaces.Workspace;
import com.angico.workspaces.WorkspaceMember;
import com.angico.workspaces.WorkspaceMemberRepository;
import com.angico.workspaces.WorkspaceRepository;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.time.Duration;
import java.sql.Timestamp;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:auth-security;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "angico.auth.required=true",
        "angico.auth.public-registration=false",
        "angico.auth.cookie-secure=false",
        "angico.seed-demo-leader=false"
})
@AutoConfigureMockMvc
class AuthSessionSecurityTest {

    private static final AtomicInteger IDS = new AtomicInteger();

    @Autowired
    private MockMvc mvc;

    @Autowired
    private PessoaRepository pessoaRepository;

    @Autowired
    private WorkspaceRepository workspaceRepository;

    @Autowired
    private WorkspaceMemberRepository memberRepository;

    @Autowired
    private PasswordHasher passwordHasher;

    @Autowired
    private AuthSessionRepository sessionRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private String email;
    private String workspaceId;

    @BeforeEach
    void createMember() {
        int id = IDS.incrementAndGet();
        workspaceId = "workspace-auth-" + id;
        email = "member-" + id + "@example.test";
        String angicoId = "member." + id;
        workspaceRepository.save(new Workspace(workspaceId, "Workspace " + id, null, Instant.now()));

        Pessoa pessoa = new Pessoa(workspaceId, "Member " + id, "MEMBER", Instant.now());
        pessoa.setEmail(email);
        pessoa.setAngicoId(angicoId);
        pessoa.setStatus("ATIVA");
        pessoa.setPasswordHash(passwordHasher.hash("correct-password"));
        pessoa = pessoaRepository.save(pessoa);
        memberRepository.save(new WorkspaceMember(
                workspaceId, angicoId, pessoa.getNome(), "MEMBER", "ACTIVE", Instant.now()));
    }

    @Test
    void unauthenticatedPrivateRequestReturns401() throws Exception {
        mvc.perform(get("/api/workspaces"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void loginIssuesHttpOnlyCookieAndReturnsOnlySessionMetadataAndCsrf() throws Exception {
        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody()))
                .andExpect(status().isOk())
                .andExpect(cookie().exists("ANGICO_SESSION"))
                .andExpect(cookie().httpOnly("ANGICO_SESSION", true))
                .andExpect(cookie().secure("ANGICO_SESSION", false))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, org.hamcrest.Matchers.containsString("SameSite=Lax")))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(jsonPath("$.csrfToken", not(blankOrNullString())))
                .andExpect(jsonPath("$.expiresAt", not(blankOrNullString())))
                .andExpect(jsonPath("$.workspaceId").value(workspaceId));
    }

    @Test
    void cookieRevalidatesThroughMeAndMutationRequiresMatchingCsrf() throws Exception {
        SessionCredentials credentials = login();

        mvc.perform(get("/api/auth/me").cookie(credentials.cookie()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.csrfToken").value(credentials.csrfToken()))
                .andExpect(jsonPath("$.workspaceId").value(workspaceId));

        mvc.perform(post("/api/workspaces")
                        .cookie(credentials.cookie())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\":\"Sem CSRF\"}"))
                .andExpect(status().isForbidden());

        mvc.perform(post("/api/workspaces")
                        .cookie(credentials.cookie())
                        .header("X-CSRF-Token", credentials.csrfToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\":\"Com CSRF\"}"))
                .andExpect(status().isCreated());
    }

    @Test
    void logoutRevokesOnlyThePresentedSessionAndClearsCookie() throws Exception {
        SessionCredentials credentials = login();

        mvc.perform(post("/api/auth/logout")
                        .cookie(credentials.cookie())
                        .header("X-CSRF-Token", credentials.csrfToken()))
                .andExpect(status().isNoContent())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, org.hamcrest.Matchers.containsString("Max-Age=0")));

        mvc.perform(get("/api/auth/me").cookie(credentials.cookie()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void publicRegistrationIsDisabledByDefault() throws Exception {
        mvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"Nova Pessoa","email":"new@example.test","angicoId":"new.person","password":"password-123"}
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    void angicoIdAvailabilityCannotBeEnumeratedWithoutAuthentication() throws Exception {
        mvc.perform(get("/api/auth/angico-id/available")
                        .param("angicoId", "member.lookup"))
                .andExpect(status().isUnauthorized());

        SessionCredentials credentials = login();
        mvc.perform(get("/api/auth/angico-id/available")
                        .cookie(credentials.cookie())
                        .param("angicoId", "member.lookup"))
                .andExpect(status().isOk());
    }

    @Test
    void invalidValidatedPayloadReturns400InsteadOf500() throws Exception {
        SessionCredentials credentials = login();

        mvc.perform(post("/api/workspaces")
                        .cookie(credentials.cookie())
                        .header("X-CSRF-Token", credentials.csrfToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void loginBackfillsOnlyThePersonsOwnLegacyWorkspaceMembership() throws Exception {
        int id = IDS.incrementAndGet();
        String ownWorkspace = "legacy-own-" + id;
        String unrelatedWorkspace = "legacy-unrelated-" + id;
        String angicoId = "legacy." + id;
        String legacyEmail = "legacy-" + id + "@example.test";
        workspaceRepository.save(new Workspace(ownWorkspace, "Legacy own", null, Instant.now()));
        workspaceRepository.save(new Workspace(unrelatedWorkspace, "Unrelated", null, Instant.now()));
        Pessoa legacy = new Pessoa(ownWorkspace, "Legacy", "LIDER", Instant.now());
        legacy.setEmail(legacyEmail);
        legacy.setAngicoId(angicoId);
        legacy.setStatus("ATIVA");
        legacy.setPasswordHash(passwordHasher.hash("correct-password"));
        pessoaRepository.save(legacy);

        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + legacyEmail + "\",\"password\":\"correct-password\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.workspaceId").value(ownWorkspace));

        var membership = memberRepository.findByWorkspaceIdAndActorId(ownWorkspace, angicoId).orElseThrow();
        org.junit.jupiter.api.Assertions.assertEquals("OWNER", membership.getRole());
        org.junit.jupiter.api.Assertions.assertTrue(
                memberRepository.findByWorkspaceIdAndActorId(unrelatedWorkspace, angicoId).isEmpty());
    }

    @Test
    void sessionPersistsOnlyHashesAndExpiresAfterTwelveHours() throws Exception {
        Instant before = Instant.now();
        MvcResult result = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody()))
                .andExpect(status().isOk())
                .andReturn();
        Instant after = Instant.now();

        Number pessoaId = com.jayway.jsonpath.JsonPath.read(
                result.getResponse().getContentAsString(), "$.pessoaId");
        String csrfToken = com.jayway.jsonpath.JsonPath.read(
                result.getResponse().getContentAsString(), "$.csrfToken");
        Instant expiresAt = Instant.parse(com.jayway.jsonpath.JsonPath.read(
                result.getResponse().getContentAsString(), "$.expiresAt"));
        String rawSessionToken = result.getResponse().getCookie("ANGICO_SESSION").getValue();
        var persisted = sessionRepository.findAll().stream()
                .filter(session -> session.getPessoaId().equals(pessoaId.longValue()))
                .findFirst()
                .orElseThrow();

        org.junit.jupiter.api.Assertions.assertNotEquals(rawSessionToken, persisted.getTokenHash());
        org.junit.jupiter.api.Assertions.assertNotEquals(csrfToken, persisted.getCsrfTokenHash());
        org.junit.jupiter.api.Assertions.assertTrue(
                !expiresAt.isBefore(before.plus(Duration.ofHours(12)))
                        && !expiresAt.isAfter(after.plus(Duration.ofHours(12))));
    }

    @Test
    void persistedExpiredSessionIsRejectedAndRevoked() throws Exception {
        SessionCredentials credentials = login();
        Long pessoaId = pessoaRepository.findByEmailIgnoreCase(email).orElseThrow().getId();
        var session = sessionRepository.findAll().stream()
                .filter(candidate -> candidate.getPessoaId().equals(pessoaId))
                .max(java.util.Comparator.comparing(com.angico.auth.AuthSession::getId))
                .orElseThrow();
        jdbcTemplate.update(
                "UPDATE auth_session SET expires_at = ? WHERE id = ?",
                Timestamp.from(Instant.now().minusSeconds(1)),
                session.getId()
        );

        mvc.perform(get("/api/auth/me").cookie(credentials.cookie()))
                .andExpect(status().isUnauthorized());

        assertNotNull(sessionRepository.findById(session.getId()).orElseThrow().getRevokedAt());
    }

    private SessionCredentials login() throws Exception {
        MvcResult result = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody()))
                .andExpect(status().isOk())
                .andReturn();
        Cookie cookie = result.getResponse().getCookie("ANGICO_SESSION");
        String csrfToken = com.jayway.jsonpath.JsonPath.read(result.getResponse().getContentAsString(), "$.csrfToken");
        return new SessionCredentials(cookie, csrfToken);
    }

    private String loginBody() {
        return "{\"email\":\"" + email + "\",\"password\":\"correct-password\"}";
    }

    private record SessionCredentials(Cookie cookie, String csrfToken) {
    }
}
