package com.angico.core.ontology;

public record RelationRule(
        String originType,
        String relationType,
        String destinationType
) {
    public String label() {
        return originType + " " + relationType + " " + destinationType;
    }
}
