package com.angico.organizacoes;

import com.angico.core.memory.MemoryEvent;
import com.angico.core.memory.MemoryRelationMetadata;
import com.angico.core.memory.OperationalMemoryService;
import com.angico.core.ontology.OntologyService;
import java.util.HashMap;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class OrganizacaoMemoryPublisher {

    private static final String SOURCE = "api";

    private final OperationalMemoryService memory;

    public OrganizacaoMemoryPublisher(OperationalMemoryService memory) {
        this.memory = memory;
    }

    public void publishOrganization(Organizacao organization) {
        String organizationId = String.valueOf(organization.getId());
        memory.registrarObjeto(
                organization.getWorkspaceId(), OntologyService.ORGANIZACAO, organizationId,
                null, organization.getNome(), organization.getStatus(), SOURCE);
        if (organization.getMissionId() != null) {
            memory.registrarRelacaoAtiva(
                    organization.getWorkspaceId(),
                    OntologyService.ORGANIZACAO,
                    organizationId,
                    OntologyService.MISSAO,
                    String.valueOf(organization.getMissionId()),
                    organization.getMissionRelation(),
                    metadata(organization.getActorId(), "Organização vinculada à missão")
            );
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("nome", organization.getNome());
        payload.put("tipo", organization.getTipo());
        if (organization.getMissionId() != null) {
            payload.put("missaoId", organization.getMissionId());
            payload.put("missionRelation", organization.getMissionRelation());
        }
        memory.registrarEvento(new MemoryEvent(
                organization.getWorkspaceId(),
                OntologyService.ORGANIZACAO,
                organizationId,
                "organizacao.criada",
                SOURCE,
                organization.getActorId(),
                null,
                null,
                null,
                1,
                organization.getCreatedAt(),
                payload
        ));
    }

    public void publishParticipation(Participacao participation) {
        String participationId = String.valueOf(participation.getId());
        memory.registrarObjeto(
                participation.getWorkspaceId(), OntologyService.PARTICIPACAO, participationId,
                null, "Participação " + participation.getPapel(), participation.getStatus(), SOURCE);
        if ("ATIVA".equals(participation.getStatus())) {
            memory.registrarRelacaoAtiva(
                    participation.getWorkspaceId(),
                    OntologyService.PESSOA,
                    String.valueOf(participation.getPessoaId()),
                    OntologyService.ORGANIZACAO,
                    String.valueOf(participation.getOrganizationId()),
                    "PARTICIPA_DE",
                    metadata(participation.getActorId(), participation.getPapel())
            );
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("organizationId", participation.getOrganizationId());
        payload.put("pessoaId", participation.getPessoaId());
        payload.put("papel", participation.getPapel());
        payload.put("status", participation.getStatus());
        payload.put("startedAt", participation.getStartedAt().toString());
        if (participation.getEndedAt() != null) {
            payload.put("endedAt", participation.getEndedAt().toString());
        }
        memory.registrarEvento(new MemoryEvent(
                participation.getWorkspaceId(),
                OntologyService.PARTICIPACAO,
                participationId,
                "participacao.registrada",
                SOURCE,
                participation.getActorId(),
                null,
                null,
                null,
                1,
                participation.getRecordedAt(),
                payload
        ));
    }

    private MemoryRelationMetadata metadata(String actorId, String context) {
        return new MemoryRelationMetadata(SOURCE, context, actorId, null);
    }
}
