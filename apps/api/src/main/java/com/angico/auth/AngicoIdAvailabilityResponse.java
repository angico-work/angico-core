package com.angico.auth;

public record AngicoIdAvailabilityResponse(
        String angicoId,
        boolean available,
        String message
) {
}
