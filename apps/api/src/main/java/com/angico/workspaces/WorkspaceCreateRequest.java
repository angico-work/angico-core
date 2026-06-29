package com.angico.workspaces;

import jakarta.validation.constraints.NotBlank;

/**
 * Payload to create a workspace. Only the display {@code nome} is required; the
 * slug (partition key) is derived from it. {@code criadoPor} optionally records
 * who created it, in the spirit of the território's omniscient memory.
 */
public record WorkspaceCreateRequest(@NotBlank String nome, String criadoPor) {
}
