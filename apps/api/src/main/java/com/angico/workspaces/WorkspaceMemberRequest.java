package com.angico.workspaces;

import jakarta.validation.constraints.NotBlank;

/**
 * Payload to add or update a workspace member. {@code actorId} is the member's
 * Angico ID. {@code displayName} defaults to the actorId when blank; {@code role}
 * defaults to MEMBER and {@code status} to ACTIVE.
 */
public record WorkspaceMemberRequest(
        @NotBlank String actorId,
        String displayName,
        String role,
        String status
) {
}
