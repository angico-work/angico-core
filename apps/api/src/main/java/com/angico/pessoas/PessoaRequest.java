package com.angico.pessoas;

import jakarta.validation.constraints.NotBlank;

/**
 * Payload to register a new pessoa. workspaceId/nome are required; papel
 * defaults when blank.
 */
public record PessoaRequest(
        @NotBlank String workspaceId,
        @NotBlank String nome,
        String papel
) {
}
