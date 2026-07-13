package com.angico.evidencias;

import java.time.Instant;

public record EvidenciaMetadataResponse(
        Long id,
        String workspaceId,
        String subjectType,
        Long subjectId,
        String title,
        String description,
        String originalFilename,
        String contentType,
        Long sizeBytes,
        String sha256,
        Instant capturedAt,
        Instant recordedAt,
        String actorId,
        String deviceId,
        String clientMutationId,
        boolean hasFile
) {
    public static EvidenciaMetadataResponse from(Evidencia evidence) {
        return new EvidenciaMetadataResponse(
                evidence.getId(),
                evidence.getWorkspaceId(),
                evidence.getSubjectType(),
                evidence.getSubjectId(),
                evidence.getTitle(),
                evidence.getDescription(),
                evidence.getOriginalFilename(),
                evidence.getContentType(),
                evidence.getSizeBytes(),
                evidence.getSha256(),
                evidence.getCapturedAt(),
                evidence.getRecordedAt(),
                evidence.getActorId(),
                evidence.getDeviceId(),
                evidence.getClientMutationId(),
                evidence.getStoragePath() != null
        );
    }
}
