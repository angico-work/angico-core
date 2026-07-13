package com.angico.mensagens;

import java.time.Instant;
import java.util.List;

public record ConversaResponse(
        Long id,
        String workspaceId,
        Long territorioId,
        String contextEntityType,
        String contextEntityId,
        String titulo,
        Long createdByPessoaId,
        String status,
        Instant createdAt,
        Instant updatedAt,
        long unreadCount,
        List<MensagemResponse> mensagens
) {
}
