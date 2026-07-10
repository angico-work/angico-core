package com.angico.security;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.angico.auth.PasswordHasher;
import com.angico.mensagens.Conversa;
import com.angico.mensagens.ConversaRepository;
import com.angico.mensagens.Mensagem;
import com.angico.mensagens.MensagemAnexo;
import com.angico.mensagens.MensagemAnexoRepository;
import com.angico.mensagens.MensagemRepository;
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
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:workspace-security;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "angico.auth.required=true",
        "angico.auth.public-registration=false",
        "angico.auth.cookie-secure=false",
        "angico.seed-demo-leader=false",
        "angico.uploads.dir=${java.io.tmpdir}/angico-workspace-security"
})
@AutoConfigureMockMvc
class WorkspaceIsolationSecurityTest {

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
    private ConversaRepository conversaRepository;

    @Autowired
    private MensagemRepository mensagemRepository;

    @Autowired
    private MensagemAnexoRepository anexoRepository;

    @Autowired
    private PasswordHasher passwordHasher;

    @Autowired
    private TerritorioRepository territorioRepository;

    private String workspaceA;
    private String workspaceB;
    private SessionCredentials memberA;
    private Pessoa pessoaA;

    @BeforeEach
    void setUp() throws Exception {
        int id = IDS.incrementAndGet();
        workspaceA = "workspace-a-" + id;
        workspaceB = "workspace-b-" + id;
        workspaceRepository.save(new Workspace(workspaceA, "Workspace A " + id, null, Instant.now()));
        workspaceRepository.save(new Workspace(workspaceB, "Workspace B " + id, null, Instant.now()));
        createPerson(workspaceB, "member.b." + id, "member-b-" + id + "@example.test", "MEMBER", false);
        pessoaA = createPerson(
                workspaceA, "member.a." + id, "member-a-" + id + "@example.test", "MEMBER", true);
        memberA = login(pessoaA);
    }

    @ParameterizedTest
    @MethodSource("privateReads")
    void memberCannotReadAnotherWorkspace(String pathTemplate) throws Exception {
        mvc.perform(get(pathTemplate.formatted(workspaceB)).cookie(memberA.cookie()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    static Stream<Arguments> privateReads() {
        return Stream.of(
                Arguments.of("/api/observacoes?workspaceId=%s"),
                Arguments.of("/api/problemas?workspaceId=%s"),
                Arguments.of("/api/potencialidades?workspaceId=%s"),
                Arguments.of("/api/missoes?workspaceId=%s"),
                Arguments.of("/api/acoes?workspaceId=%s"),
                Arguments.of("/api/pessoas?workspaceId=%s"),
                Arguments.of("/api/glimpse/dashboard?workspaceId=%s"),
                Arguments.of("/api/glimpse/map?workspaceId=%s"),
                Arguments.of("/api/glimpse/memoria?workspaceId=%s"),
                Arguments.of("/api/indicadores?workspaceId=%s"),
                Arguments.of("/api/medicoes?workspaceId=%s"),
                Arguments.of("/api/territorios?workspaceId=%s"),
                Arguments.of("/api/history/workspaces/%s")
        );
    }

    @Test
    void memberCannotCreateObservationInAnotherWorkspace() throws Exception {
        mvc.perform(post("/api/observacoes")
                        .cookie(memberA.cookie())
                        .header("X-CSRF-Token", memberA.csrfToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"workspaceId":"%s","categoria":"AMBIENTE","titulo":"Invasão de partição"}
                                """.formatted(workspaceB)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    void workspaceListingDoesNotEnumerateInaccessibleWorkspaces() throws Exception {
        mvc.perform(get("/api/workspaces").cookie(memberA.cookie()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].slug", hasItem(workspaceA)))
                .andExpect(jsonPath("$[*].slug", not(hasItem(workspaceB))));
    }

    @Test
    void nonParticipantCannotListReadMessagesOrDownloadAttachments() throws Exception {
        int id = IDS.incrementAndGet();
        String participantId = "participant." + id;
        Pessoa participant = createPerson(
                workspaceA, participantId, "participant-" + id + "@example.test", "MEMBER", false);

        Conversa conversa = new Conversa();
        conversa.setWorkspaceId(workspaceA);
        conversa.setTitulo("Conversa privada");
        conversa.setCreatedByPessoaId(participant.getId());
        conversa.setStatus("ATIVA");
        conversa.setCreatedAt(Instant.now());
        conversa.setUpdatedAt(Instant.now());
        conversa = conversaRepository.save(conversa);

        Mensagem mensagem = new Mensagem();
        mensagem.setWorkspaceId(workspaceA);
        mensagem.setConversaId(conversa.getId());
        mensagem.setSenderPessoaId(participant.getId());
        mensagem.setSenderNome(participant.getNome());
        mensagem.setCorpo("Conteúdo privado");
        mensagem.setStatus("ENVIADA");
        mensagem.setCreatedAt(Instant.now());
        mensagem = mensagemRepository.save(mensagem);

        MensagemAnexo anexo = new MensagemAnexo();
        anexo.setWorkspaceId(workspaceA);
        anexo.setMensagemId(mensagem.getId());
        anexo.setOriginalFilename("privado.txt");
        anexo.setContentType("text/plain");
        anexo.setSizeBytes(7L);
        anexo.setStoragePath("/tmp/nonexistent-private-attachment");
        anexo.setAttachmentType("ARQUIVO");
        anexo.setCreatedAt(Instant.now());
        anexo = anexoRepository.save(anexo);

        mvc.perform(get("/api/mensagens/conversas?workspaceId=" + workspaceA).cookie(memberA.cookie()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
        mvc.perform(get("/api/mensagens/conversas/" + conversa.getId()).cookie(memberA.cookie()))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/mensagens/conversas/" + conversa.getId() + "/mensagens").cookie(memberA.cookie()))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/mensagens/anexos/" + anexo.getId()).cookie(memberA.cookie()))
                .andExpect(status().isForbidden());
    }

    @Test
    void memberCanCreateConversationInAnAuthorizedSecondaryWorkspace() throws Exception {
        memberRepository.save(new WorkspaceMember(
                workspaceB, pessoaA.getAngicoId(), pessoaA.getNome(), "MEMBER", "ACTIVE", Instant.now()));
        Territorio territorio = new Territorio();
        territorio.setWorkspaceId(workspaceB);
        territorio.setNome("Território secundário");
        territorio.setCreatedAt(Instant.now());
        territorio.setUpdatedAt(Instant.now());
        territorio = territorioRepository.save(territorio);

        mvc.perform(post("/api/mensagens/conversas")
                        .cookie(memberA.cookie())
                        .header("X-CSRF-Token", memberA.csrfToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"workspaceId":"%s","territorioId":%d,"titulo":"Conversa secundária","participanteIds":[],"participanteRefs":[]}
                                """.formatted(workspaceB, territorio.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.workspaceId").value(workspaceB));
    }

    private Pessoa createPerson(
            String workspaceId,
            String angicoId,
            String email,
            String role,
            boolean withPassword
    ) {
        Pessoa pessoa = new Pessoa(workspaceId, angicoId, role, Instant.now());
        pessoa.setEmail(email);
        pessoa.setAngicoId(angicoId);
        pessoa.setStatus("ATIVA");
        if (withPassword) {
            pessoa.setPasswordHash(passwordHasher.hash("correct-password"));
        }
        pessoa = pessoaRepository.save(pessoa);
        memberRepository.save(new WorkspaceMember(
                workspaceId, angicoId, angicoId, role, "ACTIVE", Instant.now()));
        return pessoa;
    }

    private SessionCredentials login(Pessoa pessoa) throws Exception {
        MvcResult result = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + pessoa.getEmail() + "\",\"password\":\"correct-password\"}"))
                .andExpect(status().isOk())
                .andReturn();
        Cookie cookie = result.getResponse().getCookie("ANGICO_SESSION");
        String csrfToken = com.jayway.jsonpath.JsonPath.read(result.getResponse().getContentAsString(), "$.csrfToken");
        return new SessionCredentials(cookie, csrfToken);
    }

    private record SessionCredentials(Cookie cookie, String csrfToken) {
    }
}
