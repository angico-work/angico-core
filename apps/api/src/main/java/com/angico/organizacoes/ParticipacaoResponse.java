package com.angico.organizacoes;

import java.time.Instant;

public record ParticipacaoResponse(
        Long id,
        String workspaceId,
        Long organizationId,
        Long pessoaId,
        String papel,
        String status,
        Instant startedAt,
        Instant endedAt,
        Instant recordedAt,
        String actorId
) {
    public static ParticipacaoResponse from(Participacao participation) {
        return new ParticipacaoResponse(
                participation.getId(),
                participation.getWorkspaceId(),
                participation.getOrganizationId(),
                participation.getPessoaId(),
                participation.getPapel(),
                participation.getStatus(),
                participation.getStartedAt(),
                participation.getEndedAt(),
                participation.getRecordedAt(),
                participation.getActorId()
        );
    }
}
