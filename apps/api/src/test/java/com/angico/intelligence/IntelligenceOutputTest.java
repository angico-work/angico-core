package com.angico.intelligence;
import static org.junit.jupiter.api.Assertions.*;
import com.angico.core.ontology.OntologyService;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
class IntelligenceOutputTest {
    final ObjectMapper mapper=new ObjectMapper();
    final OntologyService ontology=new OntologyService();
    final List<IntelligenceSource> sources=List.of(new IntelligenceSource("PROBLEMA:1","PROBLEMA","1","Lixo","Relato anterior",Instant.EPOCH));
    String payload(String category,String summary,String connections,String recommendations) {
        return "{\"category\":"+category+",\"summary\":"+mapper.writeValueAsString(summary)+",\"connections\":"+connections+",\"recommendations\":"+recommendations+"}";
    }
    @Test void permitsAbstentionWithNoInventedEvidence() {
        var result=IntelligenceOutput.validate("id","OBSERVACAO",mapper.readTree(payload("null","Informação insuficiente.","[]","[]")),List.of(),ontology);
        assertNull(result.category()); assertTrue(result.sources().isEmpty()); assertTrue(result.connections().isEmpty());
    }
    @Test void validatesRealOntologyDirectionWithoutCreatingAConnection() {
        String connection="{\"sourceId\":\"PROBLEMA:1\",\"relationType\":\"IDENTIFICA\",\"reason\":\"Hipótese a revisar\"}";
        var result=IntelligenceOutput.validate("id","OBSERVACAO",mapper.readTree(payload("\"Resíduos\"","O relato não confirma ocorrência.","["+connection+"]","[]")),sources,ontology);
        assertEquals("IDENTIFICA",result.connections().getFirst().relationType());
        assertThrows(IllegalArgumentException.class,()->IntelligenceOutput.validate("id","PROBLEMA",mapper.readTree(payload("null","Relato","["+connection+"]","[]")),sources,ontology));
    }
    @Test void rejectsExcessiveOutputEmptyCitationsWrongTypesAndOversizedText() {
        String c="{\"sourceId\":\"PROBLEMA:1\",\"relationType\":null,\"reason\":\"Hipótese\"}";
        List<String> invalid=List.of(
            payload("null","Relato","["+String.join(",",Collections.nCopies(4,c))+"]","[]"),
            payload("null","Relato","[]","[{\"text\":\"Verifique\",\"sourceIds\":[]}]"),
            payload("123","Relato","[]","[]"),
            payload("null","x".repeat(2001),"[]","[]"),
            payload("null","Relato","[]","[{\"text\":\"Verifique\",\"sourceIds\":[\"PROBLEMA:999\"]}]"));
        for (String input:invalid) assertThrows(IllegalArgumentException.class,()->IntelligenceOutput.validate("id","OBSERVACAO",mapper.readTree(input),sources,ontology));
    }
}
