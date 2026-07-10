package com.angico.core.ontology;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;

@Service
public class OntologyService {

    public static final String TERRITORIO = "TERRITORIO";
    public static final String PESSOA = "PESSOA";
    public static final String ORGANIZACAO = "ORGANIZACAO";
    public static final String PARTICIPACAO = "PARTICIPACAO";
    public static final String OBSERVACAO = "OBSERVACAO";
    public static final String EVIDENCIA = "EVIDENCIA";
    public static final String PROBLEMA = "PROBLEMA";
    public static final String POTENCIALIDADE = "POTENCIALIDADE";
    public static final String MISSAO = "MISSAO";
    public static final String ACAO = "ACAO";
    public static final String INDICADOR = "INDICADOR";
    public static final String MEDICAO = "MEDICAO";
    public static final String RESULTADO = "RESULTADO";
    public static final String CONVERSA = "CONVERSA";
    public static final String MENSAGEM = "MENSAGEM";
    public static final String ANEXO = "ANEXO";
    public static final String LOCALIZACAO = "LOCALIZACAO";
    public static final String WORKSPACE = "WORKSPACE";

    private static final List<String> DEFAULT_OBJECT_TYPES = List.of(
            TERRITORIO,
            PESSOA,
            ORGANIZACAO,
            PARTICIPACAO,
            OBSERVACAO,
            EVIDENCIA,
            PROBLEMA,
            POTENCIALIDADE,
            MISSAO,
            ACAO,
            INDICADOR,
            MEDICAO,
            RESULTADO,
            CONVERSA,
            MENSAGEM,
            ANEXO,
            LOCALIZACAO,
            WORKSPACE
    );

    private static final List<RelationRule> DEFAULT_RELATION_RULES = List.of(
            new RelationRule(OBSERVACAO, "OCORRE_EM", TERRITORIO),
            new RelationRule(OBSERVACAO, "REGISTRADA_POR", PESSOA),
            new RelationRule(OBSERVACAO, "COMPROVADA_POR", EVIDENCIA),
            new RelationRule(OBSERVACAO, "IDENTIFICA", PROBLEMA),
            new RelationRule(PROBLEMA, "AFETA", TERRITORIO),
            new RelationRule(PROBLEMA, "PRIORIZADO_POR", PESSOA),
            new RelationRule(MISSAO, "ENFRENTA", PROBLEMA),
            new RelationRule(MISSAO, "ATUA_EM", TERRITORIO),
            new RelationRule(PESSOA, "PARTICIPA_DE", ORGANIZACAO),
            new RelationRule(ORGANIZACAO, "CONDUZ", MISSAO),
            new RelationRule(ORGANIZACAO, "MOBILIZA", MISSAO),
            new RelationRule(MISSAO, "COMPOSTA_POR", ACAO),
            new RelationRule(PESSOA, "RESPONSAVEL_POR", ACAO),
            new RelationRule(ACAO, "PRODUZ", RESULTADO),
            new RelationRule(ACAO, "GERA", EVIDENCIA),
            new RelationRule(EVIDENCIA, "SUSTENTA", RESULTADO),
            new RelationRule(INDICADOR, "MEDE", RESULTADO),
            new RelationRule(MEDICAO, "REFERE_SE_A", INDICADOR),
            new RelationRule(POTENCIALIDADE, "EXISTE_EM", TERRITORIO),
            new RelationRule(POTENCIALIDADE, "APOIA", MISSAO),
            new RelationRule(PESSOA, "RESPONSAVEL_POR", MISSAO),
            new RelationRule(CONVERSA, "PERTENCE_A", TERRITORIO),
            new RelationRule(CONVERSA, "TEM_PARTICIPANTE", PESSOA),
            new RelationRule(MENSAGEM, "ENVIADA_EM", CONVERSA),
            new RelationRule(MENSAGEM, "ENVIADA_POR", PESSOA),
            new RelationRule(MENSAGEM, "ANEXA", ANEXO),
            new RelationRule(MENSAGEM, "COMPARTILHA", LOCALIZACAO),
            new RelationRule(LOCALIZACAO, "REFERE_SE_A", TERRITORIO),
            new RelationRule(MENSAGEM, "MENCIONA", TERRITORIO),
            new RelationRule(MENSAGEM, "MENCIONA", OBSERVACAO),
            new RelationRule(MENSAGEM, "MENCIONA", PROBLEMA),
            new RelationRule(MENSAGEM, "MENCIONA", POTENCIALIDADE),
            new RelationRule(MENSAGEM, "MENCIONA", MISSAO),
            new RelationRule(MENSAGEM, "MENCIONA", ACAO),
            new RelationRule(MENSAGEM, "MENCIONA", RESULTADO),
            new RelationRule(MENSAGEM, "MENCIONA", INDICADOR),
            new RelationRule(WORKSPACE, "POSSUI_MEMBRO", PESSOA)
    );

    private final List<String> objectTypes;
    private final List<RelationRule> relationRules;

    public OntologyService() {
        this(DEFAULT_OBJECT_TYPES, DEFAULT_RELATION_RULES);
    }

    OntologyService(List<String> objectTypes, List<RelationRule> relationRules) {
        this.objectTypes = List.copyOf(objectTypes);
        this.relationRules = List.copyOf(relationRules);
    }

    public List<String> objectTypes() {
        return List.copyOf(objectTypes);
    }

    public List<String> relationTypes() {
        return relationRules.stream().map(RelationRule::label).toList();
    }

    public Map<String, Object> describe() {
        return Map.of(
                "objectTypes", objectTypes(),
                "relations", relationRules.stream().map(rule -> Map.of(
                        "originType", rule.originType(),
                        "relationType", rule.relationType(),
                        "destinationType", rule.destinationType(),
                        "label", rule.label()
                )).toList()
        );
    }

    public void requireObjectType(String objectType) {
        canonicalObjectType(objectType);
    }

    public String canonicalObjectType(String objectType) {
        String canonical = canonicalToken(objectType, "Tipo ontologico invalido");
        if (!objectTypes.contains(canonical)) {
            throw new IllegalArgumentException("Tipo ontologico invalido: " + objectType);
        }
        return canonical;
    }

    public String canonicalRelationType(String relationType) {
        return canonicalToken(relationType, "Relacao ontologica invalida");
    }

    public void requireValidRelation(String originType, String relationType, String destinationType) {
        String canonicalOrigin = canonicalObjectType(originType);
        String canonicalDestination = canonicalObjectType(destinationType);
        String canonicalRelation = canonicalRelationType(relationType);

        RelationRule candidate = new RelationRule(canonicalOrigin, canonicalRelation, canonicalDestination);
        if (!relationRules.contains(candidate)) {
            throw new IllegalArgumentException(
                    "Relacao ontologica invalida: " + candidate.label()
            );
        }
    }

    public OntologyValidationResponse validate() {
        List<String> errors = new ArrayList<>();
        Set<String> seenTypes = new HashSet<>();
        for (String objectType : objectTypes) {
            String canonical;
            try {
                canonical = canonicalToken(objectType, "Tipo ontologico invalido");
            } catch (IllegalArgumentException ex) {
                errors.add(ex.getMessage());
                continue;
            }
            if (!canonical.equals(objectType)) {
                errors.add("Tipo nao canonico: " + objectType);
            }
            if (!seenTypes.add(canonical)) {
                errors.add("Tipo duplicado: " + canonical);
            }
        }

        Set<String> seenRelations = new HashSet<>();
        for (RelationRule rule : relationRules) {
            if (!objectTypes.contains(rule.originType())) {
                errors.add("Origem desconhecida: " + rule.label());
            }
            if (!objectTypes.contains(rule.destinationType())) {
                errors.add("Destino desconhecido: " + rule.label());
            }
            try {
                if (!canonicalRelationType(rule.relationType()).equals(rule.relationType())) {
                    errors.add("Relacao nao canonica: " + rule.label());
                }
            } catch (IllegalArgumentException ex) {
                errors.add(ex.getMessage());
            }
            if (!seenRelations.add(rule.label())) {
                errors.add("Relacao duplicada: " + rule.label());
            }
        }

        return new OntologyValidationResponse(
                errors.isEmpty(),
                objectTypes(),
                relationTypes(),
                relationTypes(),
                List.copyOf(errors)
        );
    }

    private String canonicalToken(String value, String errorPrefix) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(errorPrefix + ": valor vazio");
        }
        return value.strip().toUpperCase(Locale.ROOT);
    }
}
