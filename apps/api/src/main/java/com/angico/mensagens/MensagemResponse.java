package com.angico.mensagens;

import java.time.Instant;
import java.util.List;

public record MensagemResponse(
        Long id,
        String workspaceId,
        Long conversaId,
        Long senderPessoaId,
        String senderNome,
        String corpo,
        Double latitude,
        Double longitude,
        String localDescricao,
        String linkedEntityType,
        String linkedEntityId,
        String clientMessageId,
        String deviceId,
        String status,
        Instant occurredAt,
        Instant recordedAt,
        Instant createdAt,
        List<MensagemAnexoResponse> anexos,
        List<String> relacoes
) {
}
