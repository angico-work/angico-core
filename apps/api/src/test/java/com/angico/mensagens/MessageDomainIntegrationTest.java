package com.angico.mensagens;

import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.angico.auth.PasswordHasher;
import com.angico.core.memory.MemoryEventRepository;
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
        "spring.datasource.url=jdbc:h2:mem:message-domain;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "angico.auth.required=true",
        "angico.auth.public-registration=false",
        "angico.auth.cookie-secure=false",
        "angico.seed-demo-leader=false",
        "angico.uploads.dir=${java.io.tmpdir}/angico-message-domain"
})
@AutoConfigureMockMvc
class MessageDomainIntegrationTest {

    private static final AtomicInteger IDS = new AtomicInteger();

    @Autowired
    private MockMvc mvc;

    @Autowired
    private WorkspaceRepository workspaceRepository;

    @Autowired
    private WorkspaceMemberRepository memberRepository;

    @Autowired
    private PessoaRepository pessoaRepository;

    @Autowired
    private TerritorioRepository territorioRepository;

    @Autowired
    private MensagemRepository mensagemRepository;

    @Autowired
    private MemoryEventRepository eventRepository;

    @Autowired
    private MemoryRelationRepository relationRepository;

    @Autowired
    private PasswordHasher passwordHasher;

    private String workspaceId;
    private Pessoa owner;
    private Pessoa participant;
    private Session ownerSession;
    private Session participantSession;
    private Territorio territorio;

    @BeforeEach
    void setUp() throws Exception {
        int suffix = IDS.incrementAndGet();
        workspaceId = "message-workspace-" + suffix;
        workspaceRepository.save(new Workspace(workspaceId, "Mensagens " + suffix, null, Instant.now()));
        owner = createPerson("owner.message." + suffix, "owner-message-" + suffix + "@example.test", "OWNER");
        participant = createPerson(
                "participant.message." + suffix,
                "participant-message-" + suffix + "@example.test",
                "MEMBER"
        );
        ownerSession = login(owner);
        participantSession = login(participant);

        territorio = new Territorio();
        territorio.setWorkspaceId(workspaceId);
        territorio.setNome("Território das mensagens " + suffix);
        territorio.setStatus("ATIVO");
        territorio.setCreatedAt(Instant.now());
        territorio.setUpdatedAt(Instant.now());
        territorio = territorioRepository.save(territorio);
    }

    @Test
    void conversationPersistsValidatedContextAndSearchFindsIt() throws Exception {
        long conversationId = createConversation("Mutirão do rio", ownerSession);

        mvc.perform(get("/api/mensagens/conversas/{id}", conversationId)
                        .cookie(ownerSession.cookie()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contextEntityType").value("TERRITORIO"))
                .andExpect(jsonPath("$.contextEntityId").value(String.valueOf(territorio.getId())));

        mvc.perform(get("/api/mensagens/busca")
                        .param("workspaceId", workspaceId)
                        .param("q", "território")
                        .cookie(ownerSession.cookie()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].conversaId").value(conversationId))
                .andExpect(jsonPath("$[0].contextEntityType").value("TERRITORIO"));

        assertEquals(1, relationRepository.findActiveRelation(
                workspaceId,
                "CONVERSA",
                String.valueOf(conversationId),
                "TERRITORIO",
                String.valueOf(territorio.getId()),
                "PERTENCE_A"
        ).size());
    }

    @Test
    void offlineReplayReturnsOriginalMessageAndRejectsDifferentPayload() throws Exception {
        long conversationId = createConversation("Plantio coletivo", ownerSession);
        String clientMessageId = "message-" + IDS.incrementAndGet();
        String occurredAt = "2026-07-09T14:30:00Z";

        MvcResult first = sendMessage(
                conversationId,
                ownerSession,
                clientMessageId,
                "Mudas recebidas no território",
                occurredAt
        ).andExpect(status().isOk())
                .andExpect(jsonPath("$.clientMessageId").value(clientMessageId))
                .andExpect(jsonPath("$.deviceId").value("field-device-1"))
                .andExpect(jsonPath("$.occurredAt").value(occurredAt))
                .andExpect(jsonPath("$.status").value("ENVIADA"))
                .andReturn();
        Number firstId = com.jayway.jsonpath.JsonPath.read(
                first.getResponse().getContentAsString(), "$.id");

        sendMessage(
                conversationId,
                ownerSession,
                clientMessageId,
                "Mudas recebidas no território",
                occurredAt
        ).andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(firstId.longValue()));

        assertEquals(1, mensagemRepository.countByWorkspaceId(workspaceId));
        var event = eventRepository.findByWorkspaceIdOrderBySequenceAsc(workspaceId).stream()
                .filter(candidate -> "MENSAGEM_ENVIADA".equals(candidate.getEventType()))
                .findFirst()
                .orElseThrow();
        assertEquals(Instant.parse(occurredAt), event.getOccurredAt());
        assertEquals(clientMessageId, event.getIdempotencyKey());
        assertEquals("field-device-1", event.getDeviceId());
        assertEquals("SYNCED_FROM_OFFLINE", event.getSyncStatus());

        sendMessage(
                conversationId,
                ownerSession,
                clientMessageId,
                "Conteúdo divergente",
                occurredAt
        ).andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));
    }

    @Test
    void readReceiptChangesOnlyTheCurrentParticipantsUnreadCounter() throws Exception {
        long conversationId = createConversation("Coordenação do viveiro", ownerSession);
        sendMessage(
                conversationId,
                participantSession,
                "message-" + IDS.incrementAndGet(),
                "Separar ferramentas amanhã",
                "2026-07-09T15:00:00Z"
        ).andExpect(status().isOk());

        mvc.perform(get("/api/mensagens/conversas")
                        .param("workspaceId", workspaceId)
                        .cookie(ownerSession.cookie()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].unreadCount").value(1));

        mvc.perform(post("/api/mensagens/conversas/{id}/leitura", conversationId)
                        .cookie(ownerSession.cookie())
                        .header("X-CSRF-Token", ownerSession.csrfToken()))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/mensagens/conversas")
                        .param("workspaceId", workspaceId)
                        .cookie(ownerSession.cookie()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].unreadCount").value(0));

        mvc.perform(get("/api/mensagens/conversas")
                        .param("workspaceId", workspaceId)
                        .cookie(participantSession.cookie()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].unreadCount").value(0));
    }

    @Test
    void searchCoversMessageBodyAndAuthorWithoutLeakingOtherConversations() throws Exception {
        long conversationId = createConversation("Equipe de campo", ownerSession);
        sendMessage(
                conversationId,
                participantSession,
                "message-" + IDS.incrementAndGet(),
                "O igarapé voltou a correr",
                "2026-07-09T16:00:00Z"
        ).andExpect(status().isOk());

        mvc.perform(get("/api/mensagens/busca")
                        .param("workspaceId", workspaceId)
                        .param("q", "igarapé")
                        .cookie(ownerSession.cookie()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].conversaId").value(conversationId))
                .andExpect(jsonPath("$[0].corpo").value("O igarapé voltou a correr"));

        mvc.perform(get("/api/mensagens/busca")
                        .param("workspaceId", workspaceId)
                        .param("q", participant.getNome())
                        .cookie(ownerSession.cookie()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].senderNome").value(participant.getNome()));
    }

    private org.springframework.test.web.servlet.ResultActions sendMessage(
            long conversationId,
            Session session,
            String clientMessageId,
            String body,
            String occurredAt
    ) throws Exception {
        return mvc.perform(multipart("/api/mensagens/conversas/{id}/mensagens", conversationId)
                .param("corpo", body)
                .param("clientMessageId", clientMessageId)
                .param("deviceId", "field-device-1")
                .param("occurredAt", occurredAt)
                .header("Idempotency-Key", clientMessageId)
                .header("X-CSRF-Token", session.csrfToken())
                .cookie(session.cookie()));
    }

    private long createConversation(String title, Session session) throws Exception {
        MvcResult result = mvc.perform(post("/api/mensagens/conversas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "workspaceId":"%s",
                                  "territorioId":%d,
                                  "contextEntityType":"TERRITORIO",
                                  "contextEntityId":"%d",
                                  "titulo":"%s",
                                  "participanteIds":[%d],
                                  "participanteRefs":[]
                                }
                                """.formatted(
                                        workspaceId,
                                        territorio.getId(),
                                        territorio.getId(),
                                        title,
                                        participant.getId()
                                ))
                        .header("X-CSRF-Token", session.csrfToken())
                        .cookie(session.cookie()))
                .andExpect(status().isOk())
                .andReturn();
        Number id = com.jayway.jsonpath.JsonPath.read(result.getResponse().getContentAsString(), "$.id");
        return id.longValue();
    }

    private Pessoa createPerson(String angicoId, String email, String role) {
        Pessoa person = new Pessoa(workspaceId, angicoId, role, Instant.now());
        person.setNome(angicoId);
        person.setEmail(email);
        person.setAngicoId(angicoId);
        person.setStatus("ATIVA");
        person.setPasswordHash(passwordHasher.hash("correct-password"));
        person = pessoaRepository.save(person);
        memberRepository.save(new WorkspaceMember(
                workspaceId,
                angicoId,
                person.getNome(),
                role,
                "ACTIVE",
                Instant.now()
        ));
        return person;
    }

    private Session login(Pessoa person) throws Exception {
        MvcResult result = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + person.getEmail()
                                + "\",\"password\":\"correct-password\"}"))
                .andExpect(status().isOk())
                .andReturn();
        Cookie cookie = result.getResponse().getCookie("ANGICO_SESSION");
        String csrfToken = com.jayway.jsonpath.JsonPath.read(
                result.getResponse().getContentAsString(), "$.csrfToken");
        return new Session(cookie, csrfToken);
    }

    private record Session(Cookie cookie, String csrfToken) {
    }
}
