package com.angico.auth;

public record AuthResponse(
        Long pessoaId,
        String nome,
        String email,
        String angicoId,
        String papel,
        String workspaceId,
        java.time.Instant expiresAt,
        String csrfToken
) {
}
