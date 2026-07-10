package com.angico.mensagens;

import java.time.Instant;

public record MensagemBuscaResponse(
        Long conversaId,
        String titulo,
        String contextEntityType,
        String contextEntityId,
        Long mensagemId,
        String corpo,
        String senderNome,
        Instant occurredAt
) {
}
