package com.angico.core.ontology;

import java.util.List;

public record OntologyValidationResponse(
        boolean valid,
        List<String> objectTypes,
        List<String> relationTypes,
        List<String> validatedPaths,
        List<String> errors
) {
    public OntologyValidationResponse publicSummary() {
        return new OntologyValidationResponse(
                valid,
                List.of(),
                List.of(),
                List.of(),
                errors
        );
    }
}
