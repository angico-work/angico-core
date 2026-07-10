package com.angico.core.memory;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
import com.angico.workspaces.Workspace;
import com.angico.workspaces.WorkspaceMember;
import com.angico.workspaces.WorkspaceMemberRepository;
import com.angico.workspaces.WorkspaceRepository;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.util.UUID;
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
        "spring.datasource.url=jdbc:h2:mem:private-memory;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "angico.auth.required=true",
        "angico.auth.public-registration=false",
        "angico.auth.cookie-secure=false",
        "angico.seed-demo-leader=false"
})
@AutoConfigureMockMvc
class PrivateMemoryVisibilityIntegrationTest {

    private static final AtomicInteger IDS = new AtomicInteger();
    private static final String PRIVATE_TITLE = "Conversa reservada sobre a nascente";
    private static final String PRIVATE_BODY = "Acesso restrito aos responsáveis";
    private static final String PRIVATE_FILENAME = "relato-reservado.pdf";

    @Autowired private MockMvc mvc;
    @Autowired private PasswordHasher passwordHasher;
    @Autowired private PessoaRepository pessoas;
    @Autowired private WorkspaceRepository workspaces;
    @Autowired private WorkspaceMemberRepository memberships;
    @Autowired private ConversaRepository conversas;
    @Autowired private MensagemRepository mensagens;
    @Autowired private MensagemAnexoRepository anexos;
    @Autowired private MemoryObjectRepository objects;
    @Autowired private MemoryRelationRepository relations;
    @Autowired private MemoryEventRepository events;

    private String workspaceId;
    private String actionId;
    private Conversa conversa;
    private Mensagem mensagem;
    private MensagemAnexo anexo;
    private Session owner;
    private Session participant;
    private Session outsider;

    @BeforeEach
    void setUp() throws Exception {
        int suffix = IDS.incrementAndGet();
        workspaceId = "private-memory-" + suffix;
        actionId = "action-private-" + suffix;
        workspaces.save(new Workspace(workspaceId, "Memória privada " + suffix, null, Instant.now()));

        Pessoa ownerPerson = person("owner.private." + suffix, "OWNER");
        Pessoa participantPerson = person("participant.private." + suffix, "COORDINATOR");
        Pessoa outsiderPerson = person("outsider.private." + suffix, "COORDINATOR");
        owner = login(ownerPerson);
        participant = login(participantPerson);
        outsider = login(outsiderPerson);

        Instant now = Instant.parse("2026-07-10T12:00:00Z");
        conversa = new Conversa();
        conversa.setWorkspaceId(workspaceId);
        conversa.setContextEntityType("ACAO");
        conversa.setContextEntityId(actionId);
        conversa.setTitulo(PRIVATE_TITLE);
        conversa.setCreatedByPessoaId(ownerPerson.getId());
        conversa.setStatus("ATIVA");
        conversa.setCreatedAt(now);
        conversa.setUpdatedAt(now);
        conversa = conversas.save(conversa);

        mensagem = new Mensagem();
        mensagem.setWorkspaceId(workspaceId);
        mensagem.setConversaId(conversa.getId());
        mensagem.setSenderPessoaId(participantPerson.getId());
        mensagem.setSenderNome(participantPerson.getNome());
        mensagem.setCorpo(PRIVATE_BODY);
        mensagem.setStatus("ENVIADA");
        mensagem.setOccurredAt(now.plusSeconds(1));
        mensagem.setRecordedAt(now.plusSeconds(2));
        mensagem.setCreatedAt(now.plusSeconds(2));
        mensagem = mensagens.save(mensagem);

        anexo = new MensagemAnexo();
        anexo.setWorkspaceId(workspaceId);
        anexo.setMensagemId(mensagem.getId());
        anexo.setOriginalFilename(PRIVATE_FILENAME);
        anexo.setContentType("application/pdf");
        anexo.setSizeBytes(12L);
        anexo.setStoragePath("/tmp/" + PRIVATE_FILENAME);
        anexo.setAttachmentType("ARQUIVO");
        anexo.setCreatedAt(now.plusSeconds(2));
        anexo = anexos.save(anexo);

        memoryObject("ACAO", actionId, "Ação pública");
        memoryObject("CONVERSA", String.valueOf(conversa.getId()), PRIVATE_TITLE);
        memoryObject("MENSAGEM", String.valueOf(mensagem.getId()), PRIVATE_BODY);
        memoryObject("ANEXO", String.valueOf(anexo.getId()), PRIVATE_FILENAME);
        memoryObject("PESSOA", String.valueOf(participantPerson.getId()), participantPerson.getNome());

        relation("CONVERSA", String.valueOf(conversa.getId()), "ACAO", actionId, "REFERE_SE_A");
        relation("CONVERSA", String.valueOf(conversa.getId()), "PESSOA",
                String.valueOf(participantPerson.getId()), "TEM_PARTICIPANTE");
        relation("MENSAGEM", String.valueOf(mensagem.getId()), "CONVERSA",
                String.valueOf(conversa.getId()), "ENVIADA_EM");
        relation("MENSAGEM", String.valueOf(mensagem.getId()), "ACAO", actionId, "MENCIONA");
        relation("MENSAGEM", String.valueOf(mensagem.getId()), "ANEXO",
                String.valueOf(anexo.getId()), "ANEXA");

        event("ACAO", actionId, "ACAO_INICIADA", "{\"publico\":true}", now);
        event("CONVERSA", String.valueOf(conversa.getId()), "CONVERSA_CRIADA",
                "{\"titulo\":\"" + PRIVATE_TITLE + "\"}", now.plusSeconds(1));
        event(" conversa ", String.valueOf(conversa.getId()), "CONVERSA_ATUALIZADA",
                "{\"titulo\":\"" + PRIVATE_TITLE + "\"}", now.plusMillis(1500));
        event("MENSAGEM", String.valueOf(mensagem.getId()), "MENSAGEM_ENVIADA",
                "{\"corpo\":\"" + PRIVATE_BODY + "\"}", now.plusSeconds(2));
        event("ANEXO", String.valueOf(anexo.getId()), "ANEXO_REGISTRADO",
                "{\"nome\":\"" + PRIVATE_FILENAME + "\"}", now.plusSeconds(3));
    }

    @Test
    void workspaceAndEntityHistoryHidePrivateEventsFromNonParticipants() throws Exception {
        String outsiderWorkspace = content(get("/api/history/workspaces/{workspaceId}", workspaceId), outsider);
        String outsiderEntity = content(get("/api/history/workspaces/{workspaceId}", workspaceId)
                .param("entityType", "CONVERSA")
                .param("entityId", String.valueOf(conversa.getId())), outsider);

        assertFalse(outsiderWorkspace.contains(PRIVATE_TITLE));
        assertFalse(outsiderWorkspace.contains(PRIVATE_BODY));
        assertFalse(outsiderWorkspace.contains(PRIVATE_FILENAME));
        assertFalse(outsiderWorkspace.contains("CONVERSA_CRIADA"));
        assertFalse(outsiderWorkspace.contains("MENSAGEM_ENVIADA"));
        assertTrue(outsiderWorkspace.contains("ACAO_INICIADA"));
        assertTrue(outsiderEntity.equals("[]"));

        String participantWorkspace = content(
                get("/api/history/workspaces/{workspaceId}", workspaceId), participant);
        String ownerWorkspace = content(
                get("/api/history/workspaces/{workspaceId}", workspaceId), owner);
        assertTrue(participantWorkspace.contains(PRIVATE_TITLE));
        assertTrue(participantWorkspace.contains(PRIVATE_BODY));
        assertTrue(ownerWorkspace.contains(PRIVATE_TITLE));
        assertTrue(ownerWorkspace.contains(PRIVATE_FILENAME));
    }

    @Test
    void ontologyGraphFiltersPrivateNodesAndRelationsAtTheReadBoundary() throws Exception {
        String outsiderGraph = content(get("/api/ontology/graph")
                .param("workspaceId", workspaceId)
                .param("entityType", "ACAO")
                .param("entityId", actionId), outsider);
        assertFalse(outsiderGraph.contains("CONVERSA:" + conversa.getId()));
        assertFalse(outsiderGraph.contains("MENSAGEM:" + mensagem.getId()));
        assertFalse(outsiderGraph.contains(PRIVATE_TITLE));
        assertFalse(outsiderGraph.contains(PRIVATE_BODY));

        String participantGraph = content(get("/api/ontology/graph")
                .param("workspaceId", workspaceId)
                .param("entityType", "ACAO")
                .param("entityId", actionId), participant);
        assertTrue(participantGraph.contains("CONVERSA:" + conversa.getId()));
        assertTrue(participantGraph.contains("MENSAGEM:" + mensagem.getId()));

        String participantMessageGraph = content(get("/api/ontology/graph")
                .param("workspaceId", workspaceId)
                .param("entityType", "MENSAGEM")
                .param("entityId", String.valueOf(mensagem.getId())), participant);
        assertTrue(participantMessageGraph.contains("ANEXO:" + anexo.getId()));

        String outsiderMessageGraph = content(get("/api/ontology/graph")
                .param("workspaceId", workspaceId)
                .param("entityType", "MENSAGEM")
                .param("entityId", String.valueOf(mensagem.getId())), outsider);
        assertFalse(outsiderMessageGraph.contains("ANEXO:" + anexo.getId()));
        assertFalse(outsiderMessageGraph.contains(PRIVATE_FILENAME));
    }

    @Test
    void glimpseMemoryOmitsPrivateActivityForNonParticipants() throws Exception {
        String outsiderMemory = content(get("/api/glimpse/memoria")
                .param("workspaceId", workspaceId), outsider);
        assertTrue(outsiderMemory.contains("ACAO_INICIADA"));
        assertFalse(outsiderMemory.contains("CONVERSA_CRIADA"));
        assertFalse(outsiderMemory.contains("MENSAGEM_ENVIADA"));
        assertFalse(outsiderMemory.contains("ANEXO_REGISTRADO"));

        String participantMemory = content(get("/api/glimpse/memoria")
                .param("workspaceId", workspaceId), participant);
        String ownerMemory = content(get("/api/glimpse/memoria")
                .param("workspaceId", workspaceId), owner);
        assertTrue(participantMemory.contains("MENSAGEM_ENVIADA"));
        assertTrue(ownerMemory.contains("ANEXO_REGISTRADO"));
    }

    @Test
    void rastroShowsOnlySanitizedPrivateStagesToAuthorizedReaders() throws Exception {
        var request = get("/api/rastro/ACAO/{actionId}", actionId)
                .param("workspaceId", workspaceId);
        String outsiderTrace = content(request, outsider);
        assertTrue(outsiderTrace.contains(actionId));
        assertFalse(outsiderTrace.contains("\"type\":\"CONVERSA\""));
        assertFalse(outsiderTrace.contains("\"type\":\"MENSAGEM\""));
        assertFalse(outsiderTrace.contains("\"type\":\"ANEXO\""));
        assertFalse(outsiderTrace.contains(PRIVATE_TITLE));
        assertFalse(outsiderTrace.contains(PRIVATE_BODY));
        assertFalse(outsiderTrace.contains(PRIVATE_FILENAME));

        String participantTrace = content(get("/api/rastro/ACAO/{actionId}", actionId)
                .param("workspaceId", workspaceId), participant);
        assertTrue(participantTrace.contains("\"type\":\"CONVERSA\""));
        assertTrue(participantTrace.contains("\"type\":\"MENSAGEM\""));
        assertTrue(participantTrace.contains("\"type\":\"ANEXO\""));
        assertFalse(participantTrace.contains(PRIVATE_TITLE));
        assertFalse(participantTrace.contains(PRIVATE_BODY));
        assertFalse(participantTrace.contains(PRIVATE_FILENAME));

        String ownerTrace = content(get("/api/rastro/ACAO/{actionId}", actionId)
                .param("workspaceId", workspaceId), owner);
        assertTrue(ownerTrace.contains("\"type\":\"CONVERSA\""));
        assertTrue(ownerTrace.contains("\"type\":\"MENSAGEM\""));
        assertTrue(ownerTrace.contains("\"type\":\"ANEXO\""));
    }

    private String content(
            org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder request,
            Session session
    ) throws Exception {
        return mvc.perform(request.cookie(session.cookie()))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
    }

    private Pessoa person(String angicoId, String role) {
        Pessoa person = new Pessoa(workspaceId, angicoId, role, Instant.now());
        person.setNome(angicoId);
        person.setEmail(angicoId + "@example.test");
        person.setAngicoId(angicoId);
        person.setStatus("ATIVA");
        person.setPasswordHash(passwordHasher.hash("correct-password"));
        person = pessoas.save(person);
        memberships.save(new WorkspaceMember(
                workspaceId, angicoId, person.getNome(), role, "ACTIVE", Instant.now()));
        return person;
    }

    private Session login(Pessoa person) throws Exception {
        MvcResult result = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + person.getEmail()
                                + "\",\"password\":\"correct-password\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return new Session(result.getResponse().getCookie("ANGICO_SESSION"));
    }

    private void memoryObject(String type, String id, String name) {
        objects.save(new StoredMemoryObject(
                workspaceId, type, id, null, name, "ATIVO", "test", Instant.now()));
    }

    private void relation(
            String originType,
            String originId,
            String destinationType,
            String destinationId,
            String type
    ) {
        relations.save(new StoredMemoryRelation(
                workspaceId, originType, originId, destinationType, destinationId, type,
                new MemoryRelationMetadata("test", "private", null, null), Instant.now()));
    }

    private void event(String type, String id, String eventType, String payload, Instant occurredAt) {
        events.save(new StoredMemoryEvent(
                UUID.randomUUID().toString(), workspaceId, type, id, eventType, "test",
                null, null, null, null, 1, occurredAt, occurredAt, null,
                "SERVER_RECORDED", payload));
    }

    private record Session(Cookie cookie) {
    }
}
