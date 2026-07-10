package com.angico.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
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
    }
}
