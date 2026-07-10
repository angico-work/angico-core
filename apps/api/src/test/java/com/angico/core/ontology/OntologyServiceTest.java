package com.angico.core.ontology;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.Test;

class OntologyServiceTest {

    private final OntologyService ontologyService = new OntologyService();

    @Test
    void validatesOperationalPath() {
        OntologyValidationResponse response = ontologyService.validate();

        assertTrue(response.valid());
        assertTrue(response.objectTypes().contains("OBSERVACAO"));
        assertTrue(response.objectTypes().contains("MENSAGEM"));
        assertTrue(response.validatedPaths().stream()
                .anyMatch(path -> path.equals("OBSERVACAO IDENTIFICA PROBLEMA")));
        assertTrue(response.validatedPaths().stream()
                .anyMatch(path -> path.equals("MENSAGEM COMPARTILHA LOCALIZACAO")));
    }

    @Test
    void allowsDeclaredRelation() {
        assertDoesNotThrow(() ->
                ontologyService.requireValidRelation("OBSERVACAO", "OCORRE_EM", "TERRITORIO")
        );
        assertDoesNotThrow(() ->
                ontologyService.requireValidRelation("MENSAGEM", "COMPARTILHA", "LOCALIZACAO")
        );
        assertDoesNotThrow(() ->
                ontologyService.requireValidRelation("pessoa", "responsavel_por", "missao")
        );
    }

    @Test
    void blocksInvalidRelation() {
        assertThrows(IllegalArgumentException.class, () ->
                ontologyService.requireValidRelation("ACAO", "OCORRE_EM", "PESSOA")
        );
    }

    @Test
    void reportsInvalidDefinitionInsteadOfHardcodingSuccess() {
        OntologyService invalid = new OntologyService(
                List.of("PESSOA", "pessoa"),
                List.of(new RelationRule("PESSOA", "participa_de", "ORGANIZACAO"))
        );

        OntologyValidationResponse response = invalid.validate();

        assertFalse(response.valid());
        assertTrue(response.errors().stream().anyMatch(error -> error.contains("duplicado")));
        assertTrue(response.errors().stream().anyMatch(error -> error.contains("Destino desconhecido")));
        assertTrue(response.errors().stream().anyMatch(error -> error.contains("nao canonica")));
    }
}
