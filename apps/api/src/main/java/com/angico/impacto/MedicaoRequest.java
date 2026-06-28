package com.angico.impacto;

import java.time.Instant;

public record MedicaoRequest(
        String workspaceId,
        Long indicadorId,
        Double valor,
        String unidade,
        String fonte,
        String actorId,
        Instant measuredAt
) {
}
