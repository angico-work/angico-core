package com.angico.auth;

public record RegisterRequest(
        String nome,
        String email,
        String angicoId,
        String password
) {
}
