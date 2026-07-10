package com.angico.security;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.junit.jupiter.api.Assertions.assertEquals;

import com.angico.auth.PasswordHasher;
import com.angico.core.memory.MemoryEventRepository;
import com.angico.impacto.Indicador;
import com.angico.impacto.IndicadorRepository;
import com.angico.impacto.Resultado;
import com.angico.impacto.ResultadoRepository;
import com.angico.missoes.Missao;
import com.angico.missoes.MissaoRepository;
import com.angico.observacoes.ObservacaoRepository;
import com.angico.observacoes.ObservacaoTerritorial;
import com.angico.pessoas.Pessoa;
import com.angico.pessoas.PessoaRepository;
import com.angico.problemas.ProblemaRepository;
import com.angico.problemas.ProblemaSocioambiental;
import com.angico.territorios.Territorio;
import com.angico.territorios.TerritorioRepository;
import com.angico.workspaces.Workspace;
import com.angico.workspaces.WorkspaceMember;
import com.angico.workspaces.WorkspaceMemberRepository;
import com.angico.workspaces.WorkspaceRepository;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:reference-security;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "angico.auth.required=true",
        "angico.auth.public-registration=false",
        "angico.auth.cookie-secure=false",
        "angico.seed-demo-leader=false"
})
@AutoConfigureMockMvc
class ReferenceIntegritySecurityTest {

    private static final AtomicInteger IDS = new AtomicInteger();

    @Autowired private MockMvc mvc;
    @Autowired private PasswordHasher passwordHasher;
    @Autowired private WorkspaceRepository workspaceRepository;
    @Autowired private WorkspaceMemberRepository memberRepository;
    @Autowired private PessoaRepository pessoaRepository;
    @Autowired private TerritorioRepository territorioRepository;
    @Autowired private ObservacaoRepository observacaoRepository;
    @Autowired private ProblemaRepository problemaRepository;
    @Autowired private MissaoRepository missaoRepository;
    @Autowired private ResultadoRepository resultadoRepository;
    @Autowired private IndicadorRepository indicadorRepository;
    @Autowired private MemoryEventRepository memoryEventRepository;

    private String workspaceA;
    private String workspaceB;
    private Pessoa pessoaA;
    private Pessoa pessoaB;
    private Territorio territorioA;
    private Territorio territorioB;
    private ObservacaoTerritorial observacaoB;
    private ProblemaSocioambiental problemaB;
    private Missao missaoB;
    private Resultado resultadoB;
    private Indicador indicadorB;
    private SessionCredentials credentials;

    @BeforeEach
    void setUp() throws Exception {
        int suffix = IDS.incrementAndGet();
        workspaceA = "reference-a-" + suffix;
        workspaceB = "reference-b-" + suffix;
        workspaceRepository.save(new Workspace(workspaceA, "Reference A", null, Instant.now()));
        workspaceRepository.save(new Workspace(workspaceB, "Reference B", null, Instant.now()));
        pessoaA = createPerson(workspaceA, "actor.a." + suffix, "actor-a-" + suffix + "@example.test");
        pessoaB = createPerson(workspaceB, "actor.b." + suffix, "actor-b-" + suffix + "@example.test");
        territorioA = territorioRepository.save(territorio(workspaceA, "Território A"));
        territorioB = territorioRepository.save(territorio(workspaceB, "Território B"));
        observacaoB = observacaoRepository.save(new ObservacaoTerritorial(
                workspaceB, String.valueOf(territorioB.getId()), "AMBIENTE", "Observação B",
                null, null, null, null, "MEDIA", "ABERTA", pessoaB.getAngicoId(), Instant.now()));
        problemaB = problemaRepository.save(new ProblemaSocioambiental(
                workspaceB, String.valueOf(territorioB.getId()), "AMBIENTE", "Problema B",
                null, null, null, null, "MEDIA", "ABERTO", String.valueOf(observacaoB.getId()),
                pessoaB.getAngicoId(), Instant.now()));
        missaoB = missaoRepository.save(new Missao(
                workspaceB, "Missão B", null, "PLANEJADA", 0,
                String.valueOf(problemaB.getId()), String.valueOf(pessoaB.getId()), Instant.now()));
        resultadoB = new Resultado();
        resultadoB.setWorkspaceId(workspaceB);
        resultadoB.setTitulo("Resultado B");
        resultadoB.setStatus("ATIVO");
        resultadoB.setCreatedAt(Instant.now());
        resultadoB = resultadoRepository.save(resultadoB);
        indicadorB = new Indicador();
        indicadorB.setWorkspaceId(workspaceB);
        indicadorB.setTerritorioId(territorioB.getId());
        indicadorB.setNome("Indicador B");
        indicadorB.setUnidade("un");
        indicadorB.setStatus("ATIVO");
        indicadorB.setCreatedAt(Instant.now());
        indicadorB.setUpdatedAt(Instant.now());
        indicadorB = indicadorRepository.save(indicadorB);
        credentials = login(pessoaA);
    }

    @Test
    void auditAuthorsComeFromTheAuthenticatedPrincipal() throws Exception {
        assertPrincipalAuthor("/api/observacoes", """
                {"workspaceId":"%s","categoria":"AMBIENTE","titulo":"Observação","autorId":"forged.actor"}
                """.formatted(workspaceA));
        assertPrincipalAuthor("/api/problemas", """
                {"workspaceId":"%s","categoria":"AMBIENTE","titulo":"Problema","autorId":"forged.actor"}
                """.formatted(workspaceA));
        assertPrincipalAuthor("/api/potencialidades", """
                {"workspaceId":"%s","categoria":"CULTURA","titulo":"Potencialidade","autorId":"forged.actor"}
                """.formatted(workspaceA));
    }

    @Test
    void crossWorkspaceReferencesAreRejectedBeforeRelationsCanBePersisted() throws Exception {
        assertForbidden("/api/observacoes", """
                {"workspaceId":"%s","territorioId":"%s","categoria":"AMBIENTE","titulo":"Observação"}
                """.formatted(workspaceA, territorioB.getId()));
        assertForbidden("/api/problemas", """
                {"workspaceId":"%s","territorioId":"%s","categoria":"AMBIENTE","titulo":"Problema"}
                """.formatted(workspaceA, territorioB.getId()));
        assertForbidden("/api/problemas", """
                {"workspaceId":"%s","origemObservacaoId":"%s","categoria":"AMBIENTE","titulo":"Problema"}
                """.formatted(workspaceA, observacaoB.getId()));
        assertForbidden("/api/potencialidades", """
                {"workspaceId":"%s","territorioId":"%s","categoria":"CULTURA","titulo":"Potencialidade"}
                """.formatted(workspaceA, territorioB.getId()));
        assertForbidden("/api/missoes", """
                {"workspaceId":"%s","titulo":"Missão","problemaId":"%s"}
                """.formatted(workspaceA, problemaB.getId()));
        assertForbidden("/api/missoes", """
                {"workspaceId":"%s","titulo":"Missão","responsavelId":"%s"}
                """.formatted(workspaceA, pessoaB.getId()));
        assertForbidden("/api/acoes", """
                {"workspaceId":"%s","titulo":"Ação","missaoId":"%s"}
                """.formatted(workspaceA, missaoB.getId()));
        assertForbidden("/api/acoes", """
                {"workspaceId":"%s","titulo":"Ação","responsavelId":"%s"}
                """.formatted(workspaceA, pessoaB.getId()));
        assertForbidden("/api/indicadores", """
                {"workspaceId":"%s","territorioId":%s,"nome":"Indicador"}
                """.formatted(workspaceA, territorioB.getId()));
        assertForbidden("/api/indicadores", """
                {"workspaceId":"%s","territorioId":%s,"resultadoId":%s,"nome":"Indicador"}
                """.formatted(workspaceA, territorioA.getId(), resultadoB.getId()));
        assertForbidden("/api/medicoes", """
                {"workspaceId":"%s","indicadorId":%s,"valor":1}
                """.formatted(workspaceA, indicadorB.getId()));
    }

    @Test
    void sameWorkspaceReferencesRemainUsableAcrossTheOperationalFlow() throws Exception {
        long observacaoId = createdId("/api/observacoes", """
                {"workspaceId":"%s","territorioId":"%s","categoria":"AMBIENTE","titulo":"Observação"}
                """.formatted(workspaceA, territorioA.getId()));
        long problemaId = createdId("/api/problemas", """
                {"workspaceId":"%s","territorioId":"%s","origemObservacaoId":"%s",\
                 "categoria":"AMBIENTE","titulo":"Problema"}
                """.formatted(workspaceA, territorioA.getId(), observacaoId));
        createdId("/api/potencialidades", """
                {"workspaceId":"%s","territorioId":"%s","categoria":"CULTURA","titulo":"Potencialidade"}
                """.formatted(workspaceA, territorioA.getId()));
        long missaoId = createdId("/api/missoes", """
                {"workspaceId":"%s","titulo":"Missão","problemaId":"%s","responsavelId":"%s"}
                """.formatted(workspaceA, problemaId, pessoaA.getId()));
        createdId("/api/acoes", """
                {"workspaceId":"%s","titulo":"Ação","missaoId":"%s","responsavelId":"%s"}
                """.formatted(workspaceA, missaoId, pessoaA.getId()));
        long indicadorId = createdId("/api/indicadores", """
                {"workspaceId":"%s","territorioId":%s,"nome":"Indicador"}
                """.formatted(workspaceA, territorioA.getId()));
        createdId("/api/medicoes", """
                {"workspaceId":"%s","indicadorId":%s,"valor":1}
                """.formatted(workspaceA, indicadorId));

        Set<String> auditedEvents = Set.of(
                "observacao.registrada",
                "problema.registrado",
                "potencialidade.registrada",
                "missao.criada",
                "acao.iniciada",
                "MEDICAO_REGISTRADA"
        );
        var relevant = memoryEventRepository.findTop100ByWorkspaceIdOrderBySequenceDesc(workspaceA)
                .stream()
                .filter(event -> auditedEvents.contains(event.getEventType()))
                .toList();
        assertEquals(auditedEvents, relevant.stream()
                .map(event -> event.getEventType())
                .collect(java.util.stream.Collectors.toSet()));
        relevant.forEach(event -> assertEquals(pessoaA.getAngicoId(), event.getActorId()));
    }

    @Test
    void missingReferencedResultIsRejectedInsteadOfSilentlyDroppingTheLink() throws Exception {
        mvc.perform(authenticatedPost("/api/indicadores", """
                        {"workspaceId":"%s","territorioId":%s,"resultadoId":999999999,"nome":"Indicador"}
                        """.formatted(workspaceA, territorioA.getId())))
                .andExpect(status().isBadRequest());
    }

    @Test
    void messageCannotMentionAnEntityFromAnotherWorkspace() throws Exception {
        long conversaId = createdId("/api/mensagens/conversas", """
                {"workspaceId":"%s","territorioId":%s,"titulo":"Conversa"}
                """.formatted(workspaceA, territorioA.getId()));

        mvc.perform(multipart("/api/mensagens/conversas/{id}/mensagens", conversaId)
                        .param("corpo", "Referência cruzada")
                        .param("linkedEntityType", "OBSERVACAO")
                        .param("linkedEntityId", String.valueOf(observacaoB.getId()))
                        .cookie(credentials.cookie())
                        .header("X-CSRF-Token", credentials.csrfToken()))
                .andExpect(status().isForbidden());
    }

    private void assertPrincipalAuthor(String path, String body) throws Exception {
        mvc.perform(authenticatedPost(path, body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.autorId").value(pessoaA.getAngicoId()));
    }

    private void assertForbidden(String path, String body) throws Exception {
        mvc.perform(authenticatedPost(path, body))
                .andExpect(status().isForbidden());
    }

    private long createdId(String path, String body) throws Exception {
        MvcResult result = mvc.perform(authenticatedPost(path, body))
                .andExpect(status().is2xxSuccessful())
                .andReturn();
        Number id = com.jayway.jsonpath.JsonPath.read(result.getResponse().getContentAsString(), "$.id");
        return id.longValue();
    }

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder authenticatedPost(
            String path,
            String body
    ) {
        return post(path)
                .cookie(credentials.cookie())
                .header("X-CSRF-Token", credentials.csrfToken())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body);
    }

    private Pessoa createPerson(String workspaceId, String angicoId, String email) {
        Pessoa pessoa = new Pessoa(workspaceId, angicoId, "MEMBER", Instant.now());
        pessoa.setEmail(email);
        pessoa.setAngicoId(angicoId);
        pessoa.setStatus("ATIVA");
        pessoa.setPasswordHash(passwordHasher.hash("correct-password"));
        pessoa = pessoaRepository.save(pessoa);
        memberRepository.save(new WorkspaceMember(
                workspaceId, angicoId, angicoId, "MEMBER", "ACTIVE", Instant.now()));
        return pessoa;
    }

    private Territorio territorio(String workspaceId, String nome) {
        Territorio territorio = new Territorio();
        territorio.setWorkspaceId(workspaceId);
        territorio.setNome(nome);
        territorio.setStatus("ATIVO");
        territorio.setCreatedAt(Instant.now());
        territorio.setUpdatedAt(Instant.now());
        return territorio;
    }

    private SessionCredentials login(Pessoa pessoa) throws Exception {
        MvcResult result = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + pessoa.getEmail()
                                + "\",\"password\":\"correct-password\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return new SessionCredentials(
                result.getResponse().getCookie("ANGICO_SESSION"),
                com.jayway.jsonpath.JsonPath.read(
                        result.getResponse().getContentAsString(), "$.csrfToken")
        );
    }

    private record SessionCredentials(Cookie cookie, String csrfToken) {
    }
}
