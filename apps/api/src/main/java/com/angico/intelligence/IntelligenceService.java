package com.angico.intelligence;

import com.angico.workspaces.WorkspaceAuthorizationService;
import com.angico.core.ontology.OntologyService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

@Service
public class IntelligenceService {
    private final IntelligenceAnalysisRepository repository;
    private final IntelligenceContextService context;
    private final OpenAiResponsesClient provider;
    private final WorkspaceAuthorizationService authorization;
    private final IntelligenceSettings settings;
    private final ObjectMapper mapper;
    private final OntologyService ontology;
    public IntelligenceService(IntelligenceAnalysisRepository repository, IntelligenceContextService context,
        OpenAiResponsesClient provider, WorkspaceAuthorizationService authorization, IntelligenceSettings settings,
        ObjectMapper mapper, OntologyService ontology) {
        this.repository=repository; this.context=context; this.provider=provider; this.authorization=authorization;
        this.settings=settings; this.mapper=mapper; this.ontology=ontology;
    }
    public IntelligenceResponse analyze(IntelligenceRequest raw) {
        String workspace=authorization.requireWritableWorkspace(raw.workspaceId());
        String actor=authorization.currentActorId();
        String type=ontology.canonicalObjectType(raw.entityType());
        IntelligenceVocabulary.categories(type);
        var input=new IntelligenceRequest(workspace,raw.requestId(),type,raw.title(),raw.description());
        if(!settings.available()) return IntelligenceResponse.state(null,"UNAVAILABLE","A análise por IA ainda não está ativada. Você pode salvar o registro normalmente.");
        var sources=context.retrieve(workspace,input.title()+" "+Objects.toString(input.description(),""));
        var reservation=repository.reserve(input,actor,hash(mapper.writeValueAsString(List.of(type,input.title(),Objects.toString(input.description(),"")))),sources);
        if(reservation.limited()) return IntelligenceResponse.state(null,"RATE_LIMITED","Limite de análises atingido. Você pode continuar registrando normalmente.");
        var row=reservation.row();
        if(!reservation.owner()) { authorization.requireMember(workspace); return repository.replay(row); }
        IntelligenceResponse response;
        OpenAiResponsesClient.Result generated=null;
        try {
            authorization.requireMember(workspace);
            generated=provider.analyze(input,sources,List.of());
            response=IntelligenceOutput.validate(row.id(),type,generated.content(),sources,ontology);
        } catch(OpenAiResponsesClient.ProviderFailure | IllegalArgumentException e) {
            response=IntelligenceResponse.state(row.id(),"FAILED","A IA não concluiu uma análise válida. O registro pode ser salvo sem ela.");
        }
        repository.complete(row.id(),response,generated);
        authorization.requireMember(workspace);
        return response;
    }
    static String hash(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch(java.security.NoSuchAlgorithmException e) { throw new IllegalStateException("SHA-256 indisponível"); }
    }
}
