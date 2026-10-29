package com.angico.intelligence;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.angico.common.*;
import com.angico.workspaces.WorkspaceAuthorizationService;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.*;
import tools.jackson.databind.ObjectMapper;

class IntelligenceFeedbackServiceTest {
    final IntelligenceTestDatabase db=new IntelligenceTestDatabase();
    final WorkspaceAuthorizationService auth=mock(WorkspaceAuthorizationService.class);
    final ObjectMapper mapper=new ObjectMapper();
    final IntelligenceAnalysisRepository repository=new IntelligenceAnalysisRepository(db.jdbc,db.tx,mapper,new IntelligenceSettings(true,"key","model",100));
    final IntelligenceFeedbackService feedback=new IntelligenceFeedbackService(repository,db.jdbc,db.tx,auth,mapper);
    final String id=UUID.randomUUID().toString();
    @BeforeEach void setup() {
        when(auth.currentActorId()).thenReturn("actor");
        when(auth.requireWritableWorkspace(anyString())).thenAnswer(i->i.getArgument(0));
        var response=new IntelligenceResponse(id,"READY","Resíduos","Relato de lixo",List.of(new IntelligenceResponse.Connection("OBSERVACAO:1",null,"Tema semelhante")),List.of(),List.of(),"");
        db.jdbc.update("insert into intelligence_analysis(id,workspace_id,actor_id,request_id,input_hash,entity_type,input_text,model,prompt_version,status,sources_json,response_json,input_tokens,output_tokens,created_at) values (?,'w','actor','request-000000001','hash','OBSERVACAO','Lixo na praça','model','v1','READY','[]',?,10,10,?)",id,mapper.writeValueAsString(response),Timestamp.from(Instant.now()));
    }
    IntelligenceFeedbackService.Feedback review(String suggestion,String decision,String correction) {
        return new IntelligenceFeedbackService.Feedback(suggestion,decision,correction,UUID.randomUUID().toString());
    }
    @Test void storesCorrectionSeparatelyAndRetrievesRelevantReviewedExample() {
        String original=db.jdbc.queryForObject("select response_json from intelligence_analysis where id=?",String.class,id);
        assertEquals("recorded",feedback.review(id,review("category","corrected","Água e Saneamento")).status());
        assertEquals(original,db.jdbc.queryForObject("select response_json from intelligence_analysis where id=?",String.class,id));
        assertEquals(List.of(new IntelligenceFeedbackService.Example("Lixo na praça","Água e Saneamento")),feedback.examples("w","OBSERVACAO","lixo praça"));
        assertTrue(feedback.examples("w","OBSERVACAO","queimada").isEmpty());
        assertTrue(feedback.examples("other","OBSERVACAO","lixo").isEmpty());
    }
    @Test void deniesUnknownAnalysisOtherActorAndRevokedWorkspace() {
        assertThrows(ForbiddenException.class,()->feedback.review("unknown",review("category","accepted",null)));
        when(auth.currentActorId()).thenReturn("actor2");
        assertThrows(ForbiddenException.class,()->feedback.review(id,review("category","accepted",null)));
        when(auth.currentActorId()).thenReturn("actor");
        doThrow(new ForbiddenException("revoked")).when(auth).requireWritableWorkspace("w");
        assertThrows(ForbiddenException.class,()->feedback.review(id,review("category","accepted",null)));
        doThrow(new ForbiddenException("revoked")).when(auth).requireMember("w");
        assertThrows(ForbiddenException.class,()->feedback.examples("w","OBSERVACAO","lixo"));
    }
    @Test void idempotentRetryCannotChangeDecision() {
        var input=review("category","accepted",null);
        assertEquals(feedback.review(id,input),feedback.review(id,input));
        assertThrows(ConflictException.class,()->feedback.review(id,new IntelligenceFeedbackService.Feedback("category","rejected",null,input.requestId())));
        assertEquals(1,db.jdbc.queryForObject("select count(*) from intelligence_feedback",Integer.class));
    }
    @Test void rejectsInventedCategoryUnknownSuggestionOrNonCategoryCorrection() {
        assertThrows(IllegalArgumentException.class,()->feedback.review(id,review("category","corrected","inexistente")));
        assertThrows(IllegalArgumentException.class,()->feedback.review(id,review("category","corrected",null)));
        assertThrows(IllegalArgumentException.class,()->feedback.review(id,review("connection:0","corrected","Resíduos")));
        assertThrows(IllegalArgumentException.class,()->feedback.review(id,review("connection:99","accepted",null)));
    }
    @Test void rejectedCategoryIsNotMemoryAndAcceptedConnectionDoesNotCreateRelation() {
        assertEquals("recorded",feedback.review(id,review("category","rejected",null)).status());
        assertTrue(feedback.examples("w","OBSERVACAO","lixo").isEmpty());
        assertEquals("recorded",feedback.review(id,review("connection:0","accepted",null)).status());
        assertEquals(0,db.jdbc.queryForObject("select count(*) from memory_relation",Integer.class));
    }
}
