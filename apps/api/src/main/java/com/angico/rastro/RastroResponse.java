package com.angico.rastro;

import java.time.Instant;
import java.util.List;

public record RastroResponse(
        String workspaceId,
        Stage root,
        List<Stage> stages,
        List<Relation> relations,
        List<Event> events,
        List<Participant> participants,
        List<Gap> gaps,
        Limits limits,
        Instant asOf
) {

    public record Reference(String type, String id, String resource) {
    }

    public record Stage(
            Reference reference,
            String name,
            String status,
            Instant occurredAt,
            Instant recordedAt,
            String syncStatus
    ) {
    }

    public record Relation(
            String type,
            Reference origin,
            Reference destination,
            String actorId,
            Instant recordedAt
    ) {
    }

    public record Event(
            String id,
            String type,
            Reference subject,
            String actorId,
            Instant occurredAt,
            Instant recordedAt,
            String syncStatus
    ) {
    }

    public record Participant(
            Reference participant,
            String name,
            String status,
            String relationType,
            Reference at
    ) {
    }

    public record Gap(
            String code,
            Reference subject,
            String reason,
            String nextAction,
            ExpectedRelation expectedRelation
    ) {
    }

    public record ExpectedRelation(
            String originType,
            String relationType,
            String destinationType
    ) {
    }

    public record Limits(
            int maxNodes,
            int maxRelations,
            int maxEvents,
            boolean truncated
    ) {
    }
}
