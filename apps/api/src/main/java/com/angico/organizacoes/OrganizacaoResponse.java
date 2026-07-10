package com.angico.organizacoes;

import java.time.Instant;

public record OrganizacaoResponse(
        Long id,
        String workspaceId,
        String nome,
        String tipo,
        String status,
        Long missaoId,
        String missionRelation,
        String actorId,
        Instant createdAt
) {
    public static OrganizacaoResponse from(Organizacao organization) {
        return new OrganizacaoResponse(
                organization.getId(),
                organization.getWorkspaceId(),
                organization.getNome(),
                organization.getTipo(),
                organization.getStatus(),
                organization.getMissionId(),
                organization.getMissionRelation(),
                organization.getActorId(),
                organization.getCreatedAt()
        );
    }
}
