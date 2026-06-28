package com.angico.mensagens;

import java.time.Instant;

public record MensagemAnexoResponse(
        Long id,
        String originalFilename,
        String contentType,
        Long sizeBytes,
        String attachmentType,
        Instant createdAt
) {
}
