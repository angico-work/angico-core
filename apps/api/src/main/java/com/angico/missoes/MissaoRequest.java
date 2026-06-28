package com.angico.missoes;

<<<<<<< HEAD
import jakarta.validation.constraints.NotBlank;

/**
 * Payload to register a new missão. Only workspaceId/titulo are strictly
 * required; problemaId/responsavelId enrich the território's memory.
 */
public record MissaoRequest(
        @NotBlank String workspaceId,
        @NotBlank String titulo,
        String descricao,
        String problemaId,
        String responsavelId
=======
public record MissaoRequest(
        String workspaceId,
        Long territorioId,
        Long problemaId,
        String titulo,
        String descricao,
        String prioridade,
        Double latitude,
        Double longitude,
        String organizacaoId,
        String actorId
>>>>>>> origin
) {
}
