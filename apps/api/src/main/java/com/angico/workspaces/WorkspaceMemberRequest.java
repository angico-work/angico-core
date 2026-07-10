package com.angico.workspaces;

import jakarta.validation.constraints.NotBlank;

public record WorkspaceMemberRequest(
        @NotBlank String actorId,
        String displayName,
        String role,
        String status
) {
}
