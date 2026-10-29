package com.angico.intelligence;

import java.util.List;

final class IntelligenceVocabulary {
    private IntelligenceVocabulary() {}
    static final List<String> ENVIRONMENT = List.of("Resíduos", "Água e Saneamento", "Mobilidade", "Áreas Verdes", "Calor e Arborização", "Desmatamento", "Queimadas", "Biodiversidade", "Segurança Alimentar", "Outros");
    static final List<String> POTENTIAL = List.of("Segurança Alimentar", "Agricultura Urbana", "Áreas Verdes", "Educação Ambiental", "Cultura e Arte", "Saberes Tradicionais", "Energia Renovável", "Reciclagem e Compostagem", "Turismo de Base Comunitária", "Saúde Comunitária", "Esporte e Lazer", "Coletivos e Associações", "Espaços Públicos", "Outros");
    static List<String> categories(String type) {
        return switch(type) {
            case "OBSERVACAO", "PROBLEMA" -> ENVIRONMENT;
            case "POTENCIALIDADE" -> POTENTIAL;
            default -> throw new IllegalArgumentException("Tipo de registro não disponível para análise.");
        };
    }
}
