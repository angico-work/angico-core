package com.angico.intelligence;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record IntelligenceRequest(
    @NotBlank @Size(max=255) String workspaceId,
    @NotBlank @Pattern(regexp="[a-zA-Z0-9-]{16,64}") String requestId,
    @NotBlank @Size(max=32) String entityType,
    @NotBlank @Size(max=255) String title,
    @Size(max=4000) String description) {}
