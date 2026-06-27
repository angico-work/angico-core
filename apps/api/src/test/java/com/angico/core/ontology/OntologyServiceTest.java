package com.angico.core.ontology;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

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
                .anyMatch(path -> path.contains("OBSERVACAO -> EVIDENCIA -> PROBLEMA")));
        assertTrue(response.validatedPaths().stream()
                .anyMatch(path -> path.contains("CONVERSA -> MENSAGEM -> LOCALIZACAO")));
    }

    @Test
    void allowsDeclaredRelation() {
        assertDoesNotThrow(() ->
                ontologyService.requireValidRelation("OBSERVACAO", "OCORRE_EM", "TERRITORIO")
        );
        assertDoesNotThrow(() ->
                ontologyService.requireValidRelation("MENSAGEM", "COMPARTILHA", "LOCALIZACAO")
        );
    }

    @Test
    void blocksInvalidRelation() {
        assertThrows(IllegalArgumentException.class, () ->
                ontologyService.requireValidRelation("ACAO", "OCORRE_EM", "PESSOA")
        );
    }
}
