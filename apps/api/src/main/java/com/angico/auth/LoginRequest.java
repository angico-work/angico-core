package com.angico.auth;

public record LoginRequest(
        String email,
        String password
) {
}
