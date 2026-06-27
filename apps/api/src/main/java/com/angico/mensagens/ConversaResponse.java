package com.angico.mensagens;

import java.time.Instant;
import java.util.List;

public record ConversaResponse(
        Long id,
        String workspaceId,
        Long territorioId,
        String titulo,
        Long createdByPessoaId,
        String status,
        Instant createdAt,
        Instant updatedAt,
        List<MensagemResponse> mensagens
) {
}
