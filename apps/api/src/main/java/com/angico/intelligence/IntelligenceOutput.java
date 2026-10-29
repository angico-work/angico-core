package com.angico.intelligence;

import com.angico.core.ontology.OntologyService;
import java.util.*;
import tools.jackson.databind.JsonNode;

/** Validate again locally: provider schema compliance does not establish authorization or factual truth. */
final class IntelligenceOutput {
    private IntelligenceOutput() {}
    static IntelligenceResponse validate(String id, String type, JsonNode node, List<IntelligenceSource> sources, OntologyService ontology) {
        fields(node,"category","summary","connections","recommendations");
        String category=node.path("category").isNull() ? null : string(node.path("category"),80);
        if (category!=null && !IntelligenceVocabulary.categories(type).contains(category)) throw new IllegalArgumentException("category");
        String summary=string(node.path("summary"),2000);
        array(node.path("connections"),0,3); array(node.path("recommendations"),0,3);
        Map<String,IntelligenceSource> allowed=new HashMap<>(); sources.forEach(s -> allowed.put(s.sourceId(),s));
        var connections=new ArrayList<IntelligenceResponse.Connection>();
        for (var c:node.path("connections")) {
            fields(c,"sourceId","relationType","reason");
            String sourceId=string(c.path("sourceId"),100);
            var target=allowed.get(sourceId); if(target==null) throw new IllegalArgumentException("source");
            String relation=c.path("relationType").isNull() ? null : string(c.path("relationType"),50);
            if (relation!=null) ontology.requireValidRelation(type,relation,target.entityType());
            connections.add(new IntelligenceResponse.Connection(sourceId,relation,string(c.path("reason"),600)));
        }
        var recommendations=new ArrayList<IntelligenceResponse.Recommendation>();
        for (var r:node.path("recommendations")) {
            fields(r,"text","sourceIds"); array(r.path("sourceIds"),1,3);
            var refs=new ArrayList<String>();
            for (var ref:r.path("sourceIds")) { String key=string(ref,100); if(!allowed.containsKey(key)) throw new IllegalArgumentException("source"); refs.add(key); }
            recommendations.add(new IntelligenceResponse.Recommendation(string(r.path("text"),600),List.copyOf(new LinkedHashSet<>(refs))));
        }
        return new IntelligenceResponse(id,"READY",category,summary,List.copyOf(connections),List.copyOf(recommendations),sources,
            "Sugestões geradas por IA. Revise as fontes; nenhuma relação foi criada.");
    }
    static void fields(JsonNode node,String... fields) {
        if(!node.isObject() || node.size()!=fields.length || Arrays.stream(fields).anyMatch(f -> !node.has(f))) throw new IllegalArgumentException("schema");
    }
    static String string(JsonNode node,int max) {
        if(!node.isTextual() || node.asText().isBlank() || node.asText().length()>max) throw new IllegalArgumentException("string");
        return node.asText();
    }
    static void array(JsonNode node,int min,int max) {
        if(!node.isArray() || node.size()<min || node.size()>max) throw new IllegalArgumentException("array");
    }
}
