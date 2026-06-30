package com.angico.core.ontology;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;

@Service
public class OntologyService {

    public static final String TERRITORIO = "TERRITORIO";
    public static final String PESSOA = "PESSOA";
    public static final String ORGANIZACAO = "ORGANIZACAO";
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

    private final Set<String> objectTypes = new LinkedHashSet<>(List.of(
            TERRITORIO,
            PESSOA,
            ORGANIZACAO,
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
    ));

    private final Set<RelationRule> relationRules = new LinkedHashSet<>(List.of(
            new RelationRule(OBSERVACAO, "OCORRE_EM", TERRITORIO),
            new RelationRule(OBSERVACAO, "REGISTRADA_POR", PESSOA),
            new RelationRule(OBSERVACAO, "COMPROVADA_POR", EVIDENCIA),
            new RelationRule(OBSERVACAO, "IDENTIFICA", PROBLEMA),
            new RelationRule(PROBLEMA, "AFETA", TERRITORIO),
            new RelationRule(PROBLEMA, "PRIORIZADO_POR", PESSOA),
            new RelationRule(MISSAO, "ENFRENTA", PROBLEMA),
            new RelationRule(MISSAO, "ATUA_EM", TERRITORIO),
            new RelationRule(MISSAO, "MOBILIZA", ORGANIZACAO),
            new RelationRule(MISSAO, "COMPOSTA_POR", ACAO),
            new RelationRule(PESSOA, "RESPONSAVEL_POR", ACAO),
            new RelationRule(ACAO, "PRODUZ", RESULTADO),
            new RelationRule(INDICADOR, "MEDE", RESULTADO),
            new RelationRule(MEDICAO, "REFERE_SE_A", INDICADOR),
            new RelationRule(POTENCIALIDADE, "EXISTE_EM", TERRITORIO),
            new RelationRule(POTENCIALIDADE, "APOIA", MISSAO),
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
    ));

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
        if (!objectTypes.contains(objectType)) {
            throw new IllegalArgumentException("Tipo ontologico invalido: " + objectType);
        }
    }

    public void requireValidRelation(String originType, String relationType, String destinationType) {
        requireObjectType(originType);
        requireObjectType(destinationType);

        RelationRule candidate = new RelationRule(originType, relationType, destinationType);
        if (!relationRules.contains(candidate)) {
            throw new IllegalArgumentException(
                    "Relacao ontologica invalida: " + candidate.label()
            );
        }
    }

    public OntologyValidationResponse validate() {
        List<String> errors = List.of();
        return new OntologyValidationResponse(
                true,
                objectTypes(),
                relationTypes(),
                List.of(
                        "OBSERVACAO -> EVIDENCIA -> PROBLEMA -> MISSAO -> ACAO -> RESULTADO -> MEDICAO",
                        "POTENCIALIDADE -> MISSAO",
                        "TERRITORIO -> TIMELINE -> GRAFO",
                        "CONVERSA -> MENSAGEM -> ANEXO",
                        "CONVERSA -> MENSAGEM -> LOCALIZACAO -> TERRITORIO",
                        "MENSAGEM -> MENCIONA -> OBJETO_OPERACIONAL"
                ),
                errors
        );
    }
}
