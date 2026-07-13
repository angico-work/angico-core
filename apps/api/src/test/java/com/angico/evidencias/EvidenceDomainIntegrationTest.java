package com.angico.evidencias;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.reset;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.angico.auth.PasswordHasher;
import com.angico.common.idempotency.IdempotencyRecordRepository;
import com.angico.core.memory.JpaMemoryGateway;
import com.angico.core.memory.MemoryEventRepository;
import com.angico.core.memory.MemoryObjectRepository;
import com.angico.core.memory.MemoryRelationRepository;
import com.angico.core.memory.StoredMemoryEvent;
import com.angico.observacoes.ObservacaoRepository;
import com.angico.observacoes.ObservacaoTerritorial;
import com.angico.pessoas.Pessoa;
import com.angico.pessoas.PessoaRepository;
import com.angico.workspaces.Workspace;
import com.angico.workspaces.WorkspaceMember;
import com.angico.workspaces.WorkspaceMemberRepository;
import com.angico.workspaces.WorkspaceRepository;
import jakarta.servlet.http.Cookie;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:evidence-domain;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "angico.auth.required=true",
        "angico.auth.public-registration=false",
        "angico.auth.cookie-secure=false",
        "angico.seed-demo-leader=false",
        "angico.uploads.dir=${java.io.tmpdir}/angico-evidence-domain",
        "angico.uploads.max-bytes=64"
})
@AutoConfigureMockMvc
class EvidenceDomainIntegrationTest {

    private static final AtomicInteger IDS = new AtomicInteger();
    private static final Path UPLOAD_ROOT = Path.of(
            System.getProperty("java.io.tmpdir"), "angico-evidence-domain");

    @Autowired private MockMvc mvc;
    @Autowired private PasswordHasher passwordHasher;
    @Autowired private PessoaRepository pessoaRepository;
    @Autowired private WorkspaceRepository workspaceRepository;
    @Autowired private WorkspaceMemberRepository memberRepository;
    @Autowired private ObservacaoRepository observacaoRepository;
    @Autowired private EvidenciaRepository evidenciaRepository;
    @Autowired private MemoryEventRepository eventRepository;
    @Autowired private MemoryObjectRepository objectRepository;
    @Autowired private MemoryRelationRepository relationRepository;
    @Autowired private IdempotencyRecordRepository idempotencyRepository;

    @MockitoSpyBean
    private JpaMemoryGateway memoryGateway;

    private String workspaceA;
    private String workspaceB;
    private Pessoa actor;
    private SessionCredentials session;

    @BeforeEach
    void setUp() throws Exception {
        reset(memoryGateway);
        int id = IDS.incrementAndGet();
        workspaceA = "evidence-a-" + id;
        workspaceB = "evidence-b-" + id;
        workspaceRepository.save(new Workspace(workspaceA, "Evidence A " + id, null, Instant.now()));
        workspaceRepository.save(new Workspace(workspaceB, "Evidence B " + id, null, Instant.now()));
        actor = createPerson(workspaceA, "evidence.actor." + id, "evidence-" + id + "@example.test");
        memberRepository.save(new WorkspaceMember(
                workspaceB, actor.getAngicoId(), actor.getNome(), "MEMBER", "ACTIVE", Instant.now()));
        session = login(actor);
    }

    @Test
    void createsListsAndDownloadsHashedEvidenceForARealObservation() throws Exception {
        ObservacaoTerritorial observation = observation(workspaceA, "Nascente registrada");
        byte[] bytes = "prova em campo".getBytes(StandardCharsets.UTF_8);

        MvcResult created = createEvidence(
                workspaceA,
                "OBSERVACAO",
                observation.getId(),
                "Foto e relato da nascente",
                new MockMultipartFile("file", "campo.txt", "text/plain", bytes),
                201
        ).andExpect(jsonPath("$.actorId").value(actor.getAngicoId()))
                .andExpect(jsonPath("$.subjectType").value("OBSERVACAO"))
                .andExpect(jsonPath("$.sha256").value(sha256(bytes)))
                .andReturn();
        long evidenciaId = responseId(created);

        mvc.perform(get("/api/evidencias")
                        .param("workspaceId", workspaceA)
                        .param("subjectType", "OBSERVACAO")
                        .param("subjectId", String.valueOf(observation.getId()))
                        .cookie(session.cookie()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(evidenciaId));

        mvc.perform(get("/api/evidencias/{id}/arquivo", evidenciaId).cookie(session.cookie()))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_PLAIN))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION,
                        org.hamcrest.Matchers.containsString("campo.txt")))
                .andExpect(content().bytes(bytes));

        assertEquals(1, objectRepository.findByWorkspaceIdAndEntityTypeIgnoreCaseAndEntityId(
                workspaceA, "EVIDENCIA", String.valueOf(evidenciaId)).size());
        assertTrue(eventRepository.findByWorkspaceIdOrderBySequenceAsc(workspaceA).stream()
                .anyMatch(event -> "evidencia.registrada".equals(event.getEventType())
                        && actor.getAngicoId().equals(event.getActorId())));
        assertTrue(relationRepository.findByWorkspaceId(workspaceA).stream()
                .anyMatch(relation -> "OBSERVACAO".equals(relation.getOriginType())
                        && String.valueOf(observation.getId()).equals(relation.getOriginId())
                        && "COMPROVADA_POR".equals(relation.getRelationType())
                        && "EVIDENCIA".equals(relation.getDestinationType())
                        && String.valueOf(evidenciaId).equals(relation.getDestinationId())));
    }

    @Test
    void rejectsOrphanCrossWorkspaceUnsafeAndSpoofedEvidence() throws Exception {
        ObservacaoTerritorial foreign = observation(workspaceB, "Registro externo");

        createEvidence(workspaceA, "OBSERVACAO", 999_999L, "Órfã", null, 400);
        createEvidence(workspaceA, "OBSERVACAO", foreign.getId(), "Externa", null, 403);
        createEvidence(workspaceA, "OBSERVACAO", observation(workspaceA, "Local").getId(), "Nome inseguro",
                new MockMultipartFile("file", "../segredo.txt", "text/plain", "texto".getBytes()), 400);
        createEvidence(workspaceA, "OBSERVACAO", observation(workspaceA, "Local 2").getId(), "MIME falso",
                new MockMultipartFile("file", "falso.png", "image/png", "texto".getBytes()), 400);
        createEvidence(workspaceA, "OBSERVACAO", observation(workspaceA, "Local 3").getId(), "Arquivo vazio",
                new MockMultipartFile("file", "vazio.txt", "text/plain", new byte[0]), 400);

        assertEquals(0, evidenciaRepository.findByWorkspaceIdOrderByRecordedAtDesc(workspaceA).size());
    }

    @Test
    void rejectsFilesLargerThanTheConfiguredLimit() throws Exception {
        ObservacaoTerritorial observation = observation(workspaceA, "Arquivo grande");
        createEvidence(workspaceA, "OBSERVACAO", observation.getId(), "Grande",
                new MockMultipartFile("file", "grande.txt", "text/plain", "x".repeat(65).getBytes()), 400);
        assertEquals(0, evidenciaRepository.findByWorkspaceIdOrderByRecordedAtDesc(workspaceA).size());
    }

    @Test
    void memoryFailureRollsBackMetadataAndDeletesTheStoredFile() throws Exception {
        ObservacaoTerritorial observation = observation(workspaceA, "Falha atômica");
        long fileCountBefore = regularFileCount(UPLOAD_ROOT);
        long idempotencyRecordsBefore = idempotencyRepository.count();
        doThrow(new IllegalStateException("memory unavailable")).when(memoryGateway).appendEvent(any());

        createEvidence(workspaceA, "OBSERVACAO", observation.getId(), "Não persiste",
                new MockMultipartFile("file", "rollback.txt", "text/plain", "rollback".getBytes()), 500);

        assertEquals(0, evidenciaRepository.findByWorkspaceIdOrderByRecordedAtDesc(workspaceA).size());
        assertEquals(fileCountBefore, regularFileCount(UPLOAD_ROOT));
        assertEquals(idempotencyRecordsBefore, idempotencyRepository.count());
    }

    @Test
    void identicalOfflineMutationReplaysTheOriginalEvidence() throws Exception {
        ObservacaoTerritorial observation = observation(workspaceA, "Mutação repetida");
        String mutation = "evidence-duplicate-" + IDS.incrementAndGet();

        MvcResult first = createMetadataEvidence(observation.getId(), mutation, 201);
        MvcResult replay = createMetadataEvidence(observation.getId(), mutation, 201);

        assertEquals(responseId(first), responseId(replay));
        assertEquals(1, evidenciaRepository.findByWorkspaceIdOrderByRecordedAtDesc(workspaceA).size());
    }

    @Test
    void sameKeyWithDifferentMetadataReturnsConflict() throws Exception {
        ObservacaoTerritorial observation = observation(workspaceA, "Payload protegido");
        String mutation = "evidence-conflict-" + IDS.incrementAndGet();

        createMetadataEvidence(
                workspaceA, observation.getId(), mutation, "Versão original", null, null, null, 201);
        createMetadataEvidence(
                workspaceA, observation.getId(), mutation, "Versão alterada", null, null, null, 409);

        assertEquals(1, evidenciaRepository.findByWorkspaceIdOrderByRecordedAtDesc(workspaceA).size());
    }

    @Test
    void identicalFileReplayKeepsOneResourceAndOneStoredFile() throws Exception {
        ObservacaoTerritorial observation = observation(workspaceA, "Arquivo repetido");
        String mutation = "evidence-file-replay-" + IDS.incrementAndGet();
        byte[] content = "conteúdo offline estável".getBytes(StandardCharsets.UTF_8);
        long filesBefore = regularFileCount(UPLOAD_ROOT);

        MvcResult first = createFileEvidence(observation.getId(), mutation, content, 201);
        MvcResult replay = createFileEvidence(observation.getId(), mutation, content, 201);

        assertEquals(responseId(first), responseId(replay));
        assertEquals(1, evidenciaRepository.findByWorkspaceIdOrderByRecordedAtDesc(workspaceA).size());
        assertEquals(filesBefore + 1, regularFileCount(UPLOAD_ROOT));
    }

    @Test
    void sameKeyWithDifferentFileBytesReturnsConflict() throws Exception {
        ObservacaoTerritorial observation = observation(workspaceA, "Arquivo protegido");
        String mutation = "evidence-file-conflict-" + IDS.incrementAndGet();

        createFileEvidence(
                observation.getId(), mutation,
                "conteúdo original".getBytes(StandardCharsets.UTF_8), 201);
        createFileEvidence(
                observation.getId(), mutation,
                "conteúdo alterado".getBytes(StandardCharsets.UTF_8), 409);

        assertEquals(1, evidenciaRepository.findByWorkspaceIdOrderByRecordedAtDesc(workspaceA).size());
    }

    @Test
    void offlineMetadataReachesEvidenceMemoryAndIdempotencyRecord() throws Exception {
        ObservacaoTerritorial observation = observation(workspaceA, "Coleta desconectada");
        String mutation = "evidence-offline-" + IDS.incrementAndGet();
        Instant capturedAt = Instant.parse("2026-07-09T18:42:00Z");
        long recordsBefore = idempotencyRepository.count();

        MvcResult result = createMetadataEvidence(
                workspaceA,
                observation.getId(),
                mutation,
                "Registro coletado sem rede",
                capturedAt,
                "field-phone-9",
                null,
                201
        );
        long evidenceId = responseId(result);
        Evidencia saved = evidenciaRepository.findById(evidenceId).orElseThrow();
        assertEquals(capturedAt, saved.getCapturedAt());
        assertEquals("field-phone-9", saved.getDeviceId());
        assertEquals(mutation, saved.getClientMutationId());

        StoredMemoryEvent event = eventRepository.findByWorkspaceIdOrderBySequenceAsc(workspaceA)
                .stream()
                .filter(candidate -> "evidencia.registrada".equals(candidate.getEventType()))
                .filter(candidate -> String.valueOf(evidenceId).equals(candidate.getEntityId()))
                .findFirst()
                .orElseThrow();
        assertEquals(capturedAt, event.getOccurredAt());
        assertEquals("field-phone-9", event.getDeviceId());
        assertEquals(mutation, event.getIdempotencyKey());
        assertEquals("SYNCED_FROM_OFFLINE", event.getSyncStatus());
        assertEquals(recordsBefore + 1, idempotencyRepository.count());
        assertEquals("EVIDENCIA", idempotencyRepository.findAll().stream()
                .filter(record -> String.valueOf(evidenceId).equals(record.getResourceId()))
                .findFirst()
                .orElseThrow()
                .getResourceType());
        assertEquals("EVIDENCIA_CREATE", idempotencyRepository.findAll().stream()
                .filter(record -> String.valueOf(evidenceId).equals(record.getResourceId()))
                .findFirst()
                .orElseThrow()
                .getOperationKind());
    }

    @Test
    void clientMutationIdAloneProvidesReplaySafety() throws Exception {
        ObservacaoTerritorial observation = observation(workspaceA, "Chave no formulário");
        String mutation = "evidence-form-key-" + IDS.incrementAndGet();
        var request = multipart("/api/evidencias")
                .param("workspaceId", workspaceA)
                .param("subjectType", "OBSERVACAO")
                .param("subjectId", String.valueOf(observation.getId()))
                .param("title", "Envio sem cabeçalho")
                .param("clientMutationId", mutation)
                .cookie(session.cookie())
                .header("X-CSRF-Token", session.csrfToken());

        long first = responseId(mvc.perform(request)
                .andExpect(status().isCreated())
                .andReturn());
        long replay = responseId(mvc.perform(multipart("/api/evidencias")
                        .param("workspaceId", workspaceA)
                        .param("subjectType", "OBSERVACAO")
                        .param("subjectId", String.valueOf(observation.getId()))
                        .param("title", "Envio sem cabeçalho")
                        .param("clientMutationId", mutation)
                        .cookie(session.cookie())
                        .header("X-CSRF-Token", session.csrfToken()))
                .andExpect(status().isCreated())
                .andReturn());

        assertEquals(first, replay);
    }

    @Test
    void headerAndClientMutationMustIdentifyTheSameOperation() throws Exception {
        ObservacaoTerritorial observation = observation(workspaceA, "Chaves divergentes");

        mvc.perform(multipart("/api/evidencias")
                        .param("workspaceId", workspaceA)
                        .param("subjectType", "OBSERVACAO")
                        .param("subjectId", String.valueOf(observation.getId()))
                        .param("title", "Não deve persistir")
                        .param("clientMutationId", "mutation-form")
                        .cookie(session.cookie())
                        .header("Idempotency-Key", "mutation-header")
                        .header("X-CSRF-Token", session.csrfToken()))
                .andExpect(status().isBadRequest());

        assertEquals(0, evidenciaRepository.findByWorkspaceIdOrderByRecordedAtDesc(workspaceA).size());
    }

    @Test
    void idempotencyKeyIsIsolatedByWorkspace() throws Exception {
        ObservacaoTerritorial observationA = observation(workspaceA, "Workspace A");
        ObservacaoTerritorial observationB = observation(workspaceB, "Workspace B");
        String mutation = "evidence-scope-" + IDS.incrementAndGet();

        long evidenceA = responseId(createMetadataEvidence(
                workspaceA, observationA.getId(), mutation, "Mesmo registro", null, null, null, 201));
        long evidenceB = responseId(createMetadataEvidence(
                workspaceB, observationB.getId(), mutation, "Mesmo registro", null, null, null, 201));

        assertNotEquals(evidenceA, evidenceB);
        assertEquals(1, evidenciaRepository.findByWorkspaceIdOrderByRecordedAtDesc(workspaceA).size());
        assertEquals(1, evidenciaRepository.findByWorkspaceIdOrderByRecordedAtDesc(workspaceB).size());
    }

    @Test
    void concurrentIdenticalRequestsReturnTheSameEvidence() throws Exception {
        ObservacaoTerritorial observation = observation(workspaceA, "Concorrência offline");
        String mutation = "evidence-concurrent-" + IDS.incrementAndGet();
        long recordsBefore = idempotencyRepository.count();
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);

        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> {
                ready.countDown();
                assertTrue(start.await(5, TimeUnit.SECONDS));
                return createMetadataEvidence(observation.getId(), mutation, 201);
            });
            var second = executor.submit(() -> {
                ready.countDown();
                assertTrue(start.await(5, TimeUnit.SECONDS));
                return createMetadataEvidence(observation.getId(), mutation, 201);
            });
            assertTrue(ready.await(5, TimeUnit.SECONDS));
            start.countDown();

            assertEquals(responseId(first.get(10, TimeUnit.SECONDS)),
                    responseId(second.get(10, TimeUnit.SECONDS)));
        }
        assertEquals(1, evidenciaRepository.findByWorkspaceIdOrderByRecordedAtDesc(workspaceA).size());
        assertEquals(recordsBefore + 1, idempotencyRepository.count());
    }

    private org.springframework.test.web.servlet.ResultActions createEvidence(
            String workspaceId,
            String subjectType,
            Long subjectId,
            String title,
            MockMultipartFile file,
            int expectedStatus
    ) throws Exception {
        var request = multipart("/api/evidencias")
                .param("workspaceId", workspaceId)
                .param("subjectType", subjectType)
                .param("subjectId", String.valueOf(subjectId))
                .param("title", title)
                .param("description", "Registro verificável")
                .param("capturedAt", "2026-07-09T18:42:00Z")
                .param("deviceId", "field-phone")
                .param("clientMutationId", "evidence-mutation-" + IDS.incrementAndGet())
                .cookie(session.cookie())
                .header("X-CSRF-Token", session.csrfToken());
        if (file != null) {
            request.file(file);
        }
        return mvc.perform(request).andExpect(status().is(expectedStatus));
    }

    private MvcResult createMetadataEvidence(Long observationId, String mutation, int expectedStatus) throws Exception {
        return createMetadataEvidence(
                workspaceA, observationId, mutation, "Evidência idempotente", null, null, null,
                expectedStatus);
    }

    private MvcResult createMetadataEvidence(
            String workspaceId,
            Long observationId,
            String mutation,
            String title,
            Instant capturedAt,
            String deviceId,
            MockMultipartFile file,
            int expectedStatus
    ) throws Exception {
        var request = multipart("/api/evidencias")
                .param("workspaceId", workspaceId)
                .param("subjectType", "OBSERVACAO")
                .param("subjectId", String.valueOf(observationId))
                .param("title", title)
                .param("clientMutationId", mutation)
                .cookie(session.cookie())
                .header("Idempotency-Key", mutation)
                .header("X-CSRF-Token", session.csrfToken());
        if (capturedAt != null) {
            request.param("capturedAt", capturedAt.toString());
        }
        if (deviceId != null) {
            request.param("deviceId", deviceId);
        }
        if (file != null) {
            request.file(file);
        }
        return mvc.perform(request)
                .andExpect(status().is(expectedStatus))
                .andReturn();
    }

    private MvcResult createFileEvidence(
            Long observationId,
            String mutation,
            byte[] content,
            int expectedStatus
    ) throws Exception {
        return createMetadataEvidence(
                workspaceA,
                observationId,
                mutation,
                "Evidência com arquivo",
                Instant.parse("2026-07-09T18:42:00Z"),
                "field-phone",
                new MockMultipartFile("file", "campo.txt", "text/plain", content),
                expectedStatus
        );
    }

    private ObservacaoTerritorial observation(String workspaceId, String title) {
        return observacaoRepository.save(new ObservacaoTerritorial(
                workspaceId, null, "AMBIENTE", title, null, null, null, null,
                "MEDIA", "REGISTRADA", actor.getAngicoId(), Instant.now()));
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

    private SessionCredentials login(Pessoa pessoa) throws Exception {
        MvcResult result = mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + pessoa.getEmail()
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

    private String sha256(byte[] bytes) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
    }

    private long regularFileCount(Path root) throws Exception {
        if (!Files.exists(root)) {
            return 0;
        }
        try (Stream<Path> paths = Files.walk(root)) {
            return paths.filter(Files::isRegularFile).count();
        }
    }

    private record SessionCredentials(Cookie cookie, String csrfToken) {
    }
}
