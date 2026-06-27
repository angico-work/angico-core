package com.angico.auth;

public record AuthResponse(
        String token,
        Long pessoaId,
        String workspaceId,
        String nome,
        String email,
        String angicoId,
        String papel
) {
}
