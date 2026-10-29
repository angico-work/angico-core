package com.angico.intelligence;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import com.angico.common.*;
import com.angico.workspaces.WorkspaceAuthorizationService;
import jakarta.validation.constraints.*;
import tools.jackson.databind.ObjectMapper;

@Service
public class IntelligenceFeedbackService {
    public record Feedback(@NotBlank @Size(max=64) String suggestionId,
        @NotBlank @Pattern(regexp="accepted|rejected|corrected") String decision,
        @Size(max=80) String correctedCategory,
        @NotBlank @Pattern(regexp="[a-zA-Z0-9-]{16,64}") String requestId) {}
    public record Receipt(String status) {}
    public record Example(String text,String category) {}
    private final IntelligenceAnalysisRepository repository;
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transaction;
    private final WorkspaceAuthorizationService authorization;
    private final ObjectMapper mapper;
    public IntelligenceFeedbackService(IntelligenceAnalysisRepository repository,JdbcTemplate jdbc,PlatformTransactionManager tx,WorkspaceAuthorizationService authorization,ObjectMapper mapper) {
        this.repository=repository; this.jdbc=jdbc; this.transaction=new TransactionTemplate(tx); this.authorization=authorization; this.mapper=mapper;
    }
    public Receipt review(String analysisId,Feedback feedback) {
        var row=repository.find(analysisId).orElseThrow(() -> new ForbiddenException("Análise indisponível."));
        authorization.requireWritableWorkspace(row.workspace());
        String actor=authorization.currentActorId();
        if(!row.actor().equals(actor)) throw new ForbiddenException("Análise indisponível.");
        if(!"READY".equals(row.status())) throw new IllegalArgumentException("A análise não está pronta para revisão.");
        var response=repository.replay(row);
        boolean category="category".equals(feedback.suggestionId());
        boolean exists=category ? response.category()!=null : suggestionExists(feedback.suggestionId(),response);
        if(!exists || !Set.of("accepted","rejected","corrected").contains(feedback.decision())) throw new IllegalArgumentException("Revisão inválida.");
        String correction=feedback.correctedCategory();
        if("corrected".equals(feedback.decision())) {
            if(!category || correction==null || !IntelligenceVocabulary.categories(row.entityType()).contains(correction)) throw new IllegalArgumentException("Correção de categoria inválida.");
        } else if(correction!=null) throw new IllegalArgumentException("Correção não se aplica a esta decisão.");
        String reviewed=category && !"rejected".equals(feedback.decision()) ? (correction==null ? response.category() : correction) : null;
        String hash=IntelligenceService.hash(mapper.writeValueAsString(Arrays.asList(feedback.suggestionId(),feedback.decision(),correction)));
        return transaction.execute(tx -> {
            jdbc.queryForList("select id from intelligence_analysis where id=? for update",analysisId);
            authorization.requireWritableWorkspace(row.workspace());
            var previous=jdbc.queryForList("select input_hash from intelligence_feedback where analysis_id=? and actor_id=? and request_id=?",analysisId,actor,feedback.requestId());
            if(!previous.isEmpty()) {
                if(!hash.equals(previous.getFirst().get("input_hash"))) throw new ConflictException("Esta revisão já foi enviada com outro conteúdo.");
                return new Receipt("recorded");
            }
            if(jdbc.queryForObject("select count(*) from intelligence_feedback where analysis_id=? and actor_id=? and suggestion_id=?",Integer.class,analysisId,actor,feedback.suggestionId())>0) throw new ConflictException("Esta sugestão já foi revisada.");
            jdbc.update("insert into intelligence_feedback(id,analysis_id,actor_id,suggestion_id,decision,corrected_category,reviewed_category,request_id,input_hash,created_at) values (?,?,?,?,?,?,?,?,?,?)",
                UUID.randomUUID().toString(),analysisId,actor,feedback.suggestionId(),feedback.decision(),correction,reviewed,feedback.requestId(),hash,Timestamp.from(Instant.now()));
            return new Receipt("recorded");
        });
    }
    public List<Example> examples(String workspace,String type,String text) {
        authorization.requireMember(workspace);
        var terms=IntelligenceContextService.tokens(text);
        if(terms.isEmpty()) return List.of();
        var candidates=jdbc.query("""
            select a.input_text,f.reviewed_category from intelligence_feedback f
            join intelligence_analysis a on a.id=f.analysis_id
            where a.workspace_id=? and a.entity_type=? and f.suggestion_id='category'
              and f.reviewed_category is not null and f.decision in ('accepted','corrected')
            order by f.created_at desc,f.id desc limit 50
            """,(r,n) -> new Example(IntelligenceContextService.safeText(r.getString("input_text"),500),r.getString("reviewed_category")),workspace,type);
        return candidates.stream().filter(e -> IntelligenceVocabulary.categories(type).contains(e.category()) && IntelligenceContextService.relevance(terms,e.text())>0)
            .sorted(Comparator.<Example>comparingInt(e -> IntelligenceContextService.relevance(terms,e.text())).reversed())
            .distinct().limit(3).toList();
    }
    private boolean suggestionExists(String id,IntelligenceResponse response) {
        if(id==null || !id.matches("(connection|recommendation):[0-2]")) return false;
        int index=id.charAt(id.length()-1)-'0';
        return id.startsWith("connection:") ? index<response.connections().size() : index<response.recommendations().size();
    }
}
