package com.angico.intelligence;

import com.angico.common.ConflictException;
import com.angico.common.ForbiddenException;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;

@Repository
public class IntelligenceAnalysisRepository {
    record Row(String id,String workspace,String actor,String inputHash,String entityType,String inputText,
               String status,String responseJson,Instant createdAt) {}
    record Reservation(Row row,boolean owner,boolean limited) {}
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transaction;
    private final ObjectMapper mapper;
    private final IntelligenceSettings settings;
    public IntelligenceAnalysisRepository(JdbcTemplate jdbc, PlatformTransactionManager tx, ObjectMapper mapper, IntelligenceSettings settings) {
        this.jdbc=jdbc; this.transaction=new TransactionTemplate(tx); this.mapper=mapper; this.settings=settings;
    }
    Reservation reserve(IntelligenceRequest input,String actor,String hash,List<IntelligenceSource> sources) {
        return transaction.execute(tx -> {
            // Lock order is always actor then workspace. Shared rows serialize limits across API instances.
            if (jdbc.queryForList("select id from pessoa where angico_id=? for update",actor).isEmpty()
                || jdbc.queryForList("select id from workspace where slug=? for update",input.workspaceId()).isEmpty()) throw new ForbiddenException("Acesso indisponível.");
            var previous=jdbc.query("select * from intelligence_analysis where workspace_id=? and actor_id=? and request_id=?",
                (r,n) -> row(r),input.workspaceId(),actor,input.requestId());
            if (!previous.isEmpty()) {
                var row=previous.getFirst();
                if (!row.inputHash().equals(hash)) throw new ConflictException("Este identificador já foi usado para outro relato.");
                return new Reservation(row,false,false);
            }
            Instant now=Instant.now();
            long userCount=jdbc.queryForObject("select count(*) from intelligence_analysis where actor_id=? and created_at>=?",Long.class,actor,Timestamp.from(now.minusSeconds(600)));
            long dayCount=jdbc.queryForObject("select count(*) from intelligence_analysis where workspace_id=? and created_at>=?",Long.class,input.workspaceId(),Timestamp.from(now.atZone(ZoneOffset.UTC).toLocalDate().atStartOfDay(ZoneOffset.UTC).toInstant()));
            if(userCount>=5 || dayCount>=settings.workspaceDailyCap()) return new Reservation(null,false,true);
            String id=UUID.randomUUID().toString();
            String inputText=IntelligenceContextService.safeText(input.title()+"\n"+Objects.toString(input.description(),""),4256);
            jdbc.update("""
                insert into intelligence_analysis (id,workspace_id,actor_id,request_id,input_hash,entity_type,input_text,model,prompt_version,status,sources_json,input_tokens,output_tokens,created_at)
                values (?,?,?,?,?,?,?,?,?,'PENDING',?,0,0,?)
                """, id,input.workspaceId(),actor,input.requestId(),hash,input.entityType(),inputText,settings.model(),OpenAiResponsesClient.PROMPT_VERSION,mapper.writeValueAsString(sources),Timestamp.from(now));
            return new Reservation(new Row(id,input.workspaceId(),actor,hash,input.entityType(),inputText,"PENDING",null,now),true,false);
        });
    }
    void complete(String id,IntelligenceResponse response,OpenAiResponsesClient.Result result) {
        jdbc.update("update intelligence_analysis set status=?,response_json=?,input_tokens=?,output_tokens=?,model=coalesce(?,model),completed_at=? where id=? and status='PENDING'",
            response.status(),mapper.writeValueAsString(response),result==null?0:result.inputTokens(),result==null?0:result.outputTokens(),result==null?null:result.model(),Timestamp.from(Instant.now()),id);
    }
    Optional<Row> find(String id) {
        return jdbc.query("select * from intelligence_analysis where id=?",(r,n) -> row(r),id).stream().findFirst();
    }
    IntelligenceResponse replay(Row row) {
        if(row.responseJson()!=null) return mapper.readValue(row.responseJson(),IntelligenceResponse.class);
        if(row.createdAt().isBefore(Instant.now().minusSeconds(120))) return IntelligenceResponse.state(row.id(),"FAILED","A análise foi interrompida. Solicite uma nova análise.");
        return IntelligenceResponse.state(row.id(),"PENDING","Esta análise ainda está em andamento. Tente consultar novamente em instantes.");
    }
    private Row row(java.sql.ResultSet r) throws java.sql.SQLException {
        return new Row(r.getString("id"),r.getString("workspace_id"),r.getString("actor_id"),r.getString("input_hash"),r.getString("entity_type"),r.getString("input_text"),r.getString("status"),r.getString("response_json"),r.getTimestamp("created_at").toInstant());
    }
}
