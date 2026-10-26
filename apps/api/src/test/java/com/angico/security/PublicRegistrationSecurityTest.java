package com.angico.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.angico.auth.AuthService;
import com.angico.workspaces.Workspace;
import com.angico.workspaces.WorkspaceMemberRepository;
import com.angico.workspaces.WorkspaceRepository;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:public-registration;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "angico.auth.required=true",
        "angico.auth.public-registration=true",
        "angico.auth.cookie-secure=false",
        "angico.seed-demo-leader=false"
})
@AutoConfigureMockMvc
class PublicRegistrationSecurityTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private WorkspaceRepository workspaceRepository;

    @Autowired
    private WorkspaceMemberRepository memberRepository;

    @Test
    void enabledRegistrationCreatesAnIsolatedWorkspaceAndOwnerMembership() throws Exception {
        workspaceRepository.save(new Workspace(
                AuthService.DEFAULT_WORKSPACE_ID, "Workspace compartilhado", null, Instant.now()));

        MvcResult result = mvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"Nova Pessoa","email":"isolated@example.test","angicoId":"isolated.person","password":"password-123"}
                                """))
                .andExpect(status().isOk())
                .andExpect(cookie().exists("ANGICO_SESSION"))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andReturn();

        String workspaceId = com.jayway.jsonpath.JsonPath.read(
                result.getResponse().getContentAsString(), "$.workspaceId");
        assertNotEquals(AuthService.DEFAULT_WORKSPACE_ID, workspaceId);
        assertTrue(workspaceRepository.existsBySlug(workspaceId));
        var membership = memberRepository.findByWorkspaceIdAndActorId(workspaceId, "isolated.person")
                .orElseThrow();
        assertEquals("OWNER", membership.getRole());
        assertEquals("ACTIVE", membership.getStatus());
        assertTrue(memberRepository.findByWorkspaceIdAndActorId(
                AuthService.DEFAULT_WORKSPACE_ID, "isolated.person").isEmpty());

        var sessionCookie = result.getResponse().getCookie("ANGICO_SESSION");
        String csrfToken = com.jayway.jsonpath.JsonPath.read(
                result.getResponse().getContentAsString(), "$.csrfToken");
        mvc.perform(get("/api/auth/me").cookie(sessionCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.angicoId").value("isolated.person"));
        mvc.perform(get("/api/workspaces").cookie(sessionCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].slug").value(workspaceId));
        mvc.perform(get("/api/workspaces/" + AuthService.DEFAULT_WORKSPACE_ID + "/members")
                        .cookie(sessionCookie))
                .andExpect(status().isForbidden());

        mvc.perform(post("/api/auth/logout").cookie(sessionCookie).header("X-CSRF-Token", csrfToken))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/auth/me").cookie(sessionCookie))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"isolated@example.test","password":"password-123"}
                                """))
                .andExpect(status().isOk())
                .andExpect(cookie().exists("ANGICO_SESSION"))
                .andExpect(jsonPath("$.workspaceId").value(workspaceId));

        mvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"Outra Pessoa","email":"ISOLATED@example.test","angicoId":"another.person","password":"password-123"}
                                """))
                .andExpect(status().isBadRequest());
        assertEquals(2, workspaceRepository.count());
    }
}
