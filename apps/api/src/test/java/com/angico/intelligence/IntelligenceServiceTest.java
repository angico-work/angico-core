package com.angico.intelligence;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.angico.common.*;
import com.angico.core.ontology.OntologyService;
import com.angico.workspaces.WorkspaceAuthorizationService;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import org.junit.jupiter.api.*;
import tools.jackson.databind.ObjectMapper;

class IntelligenceServiceTest {
    final ObjectMapper mapper = new ObjectMapper();
    final IntelligenceTestDatabase db = new IntelligenceTestDatabase();
    final WorkspaceAuthorizationService auth = mock(WorkspaceAuthorizationService.class);
    final AtomicInteger calls = new AtomicInteger();
    String output = "{\"category\":\"Resíduos\",\"summary\":\"O relato menciona lixo, sem comprovação independente.\",\"connections\":[{\"sourceId\":\"OBSERVACAO:1\",\"relationType\":null,\"reason\":\"Tema semelhante; verificar se é o mesmo local.\"}],\"recommendations\":[{\"text\":\"Verificar coleta no local.\",\"sourceIds\":[\"OBSERVACAO:1\"]}]}";
    Runnable onProvider = () -> {};
    final IntelligenceSettings settings = new IntelligenceSettings(true,"test-secret","test-model",100);
    IntelligenceAnalysisRepository repository;
    IntelligenceService service;
    @BeforeEach void setup() {
        when(auth.requireWritableWorkspace(anyString())).thenAnswer(i -> i.getArgument(0));
        when(auth.currentActorId()).thenReturn("actor");
        service = service(settings);
    }
    IntelligenceService service(IntelligenceSettings config) {
        repository = new IntelligenceAnalysisRepository(db.jdbc,db.tx,mapper,config);
        var provider = new OpenAiResponsesClient(config,mapper,r -> { throw new AssertionError("No HTTP calls"); }) {
            @Override public Result analyze(IntelligenceRequest input, List<IntelligenceSource> sources, List<?> examples) {
                calls.incrementAndGet(); onProvider.run();
                return new Result(mapper.readTree(output),120,40,"test-model");
            }
        };
        return new IntelligenceService(repository,new IntelligenceContextService(db.jdbc,auth),provider,auth,config,mapper,new OntologyService());
    }
    IntelligenceRequest input(String id) { return new IntelligenceRequest("w",id,"OBSERVACAO","Lixo na praça","Relato sintético"); }
    IntelligenceRequest next() { return input(UUID.randomUUID().toString()); }

    @Test void persistsProvenanceAndReplaysWithoutAnotherPaidRequest() {
        var input = next();
        var response = service.analyze(input);
        assertEquals("READY",response.status());
        assertEquals("Resíduos",response.category());
        assertEquals(1,response.sources().size());
        assertEquals(response,service.analyze(input));
        assertEquals(1,calls.get());
        assertEquals(120,db.jdbc.queryForObject("select input_tokens from intelligence_analysis",Integer.class));
        assertFalse(db.jdbc.queryForObject("select response_json from intelligence_analysis",String.class).contains("test-secret"));
    }
    @Test void deniesOtherWorkspaceAndRechecksMembershipAfterProvider() {
        doThrow(new ForbiddenException("no")).when(auth).requireWritableWorkspace("other");
        assertThrows(ForbiddenException.class,() -> service.analyze(new IntelligenceRequest("other",UUID.randomUUID().toString(),"OBSERVACAO","Lixo","")));
        assertEquals(0,calls.get());
        onProvider = () -> doThrow(new ForbiddenException("revoked")).when(auth).requireMember("w");
        assertThrows(ForbiddenException.class,() -> service.analyze(next()));
    }
    @Test void missingKeyOrDisabledFeatureDoesNotSpendOrBlockRecordCreation() {
        service = service(new IntelligenceSettings(true,"","test-model",100));
        assertEquals("UNAVAILABLE",service.analyze(next()).status());
        assertEquals(0,calls.get());
    }
    @Test void rejectsRequestIdReuseWithDifferentInput() {
        var input = next(); service.analyze(input);
        assertThrows(ConflictException.class,() -> service.analyze(new IntelligenceRequest("w",input.requestId(),"OBSERVACAO","Mudou","")));
        assertEquals(1,calls.get());
    }
    @Test void rejectsUnknownReferencesInvalidCategoriesRelationsAndOversizedOutput() {
        for (String invalid : List.of(output.replace("OBSERVACAO:1","OBSERVACAO:999"),output.replace("Resíduos","Categoria inventada"),output.replace("\"relationType\":null","\"relationType\":\"CAUSA\""),output.replace("\"summary\":", "\"extra\":true,\"summary\":"))) {
            output = invalid;
            var response = service.analyze(next());
            assertEquals("FAILED",response.status());
            assertTrue(response.sources().isEmpty());
            assertNull(response.category());
        }
    }
    @Test void boundsSpendingAcrossParallelRequests() throws Exception {
        try (var pool = Executors.newFixedThreadPool(8)) {
            var tasks = new ArrayList<Callable<IntelligenceResponse>>();
            for (int i=0;i<8;i++) tasks.add(() -> service.analyze(next()));
            var results = pool.invokeAll(tasks);
            long ready=0,limited=0;
            for (var r : results) { var status = r.get().status(); if(status.equals("READY")) ready++; if(status.equals("RATE_LIMITED")) limited++; }
            assertEquals(5,ready); assertEquals(3,limited); assertEquals(5,calls.get());
        }
    }
    @Test void workspaceDailyLimitIncludesOtherActors() {
        service = service(new IntelligenceSettings(true,"test-secret","test-model",1));
        assertEquals("READY",service.analyze(next()).status());
        when(auth.currentActorId()).thenReturn("actor2");
        assertEquals("RATE_LIMITED",service.analyze(next()).status());
        assertEquals(1,calls.get());
    }
    @Test void pendingDuplicateNeverSpendsTwice() throws Exception {
        var entered=new CountDownLatch(1); var release=new CountDownLatch(1);
        onProvider = () -> { entered.countDown(); try { assertTrue(release.await(5,TimeUnit.SECONDS)); } catch (InterruptedException e) { throw new AssertionError(e); } };
        var input=next();
        try (var pool=Executors.newSingleThreadExecutor()) {
            var first=pool.submit(() -> service.analyze(input));
            try { assertTrue(entered.await(5,TimeUnit.SECONDS)); assertEquals("PENDING",service.analyze(input).status()); }
            finally { release.countDown(); }
            assertEquals("READY",first.get().status());
        }
        assertEquals(1,calls.get());
    }
    @Test void providerFailureIsRedactedAndIdempotent() {
        onProvider=() -> { throw new OpenAiResponsesClient.ProviderFailure(); };
        var input=next();
        assertEquals("FAILED",service.analyze(input).status());
        assertEquals("FAILED",service.analyze(input).status());
        assertEquals(1,calls.get());
    }
}
