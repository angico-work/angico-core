package com.angico.pessoas;

import jakarta.validation.constraints.NotBlank;

/**
 * Payload to register a new pessoa. workspaceId/nome are required; papel
 * defaults when blank. angicoId is optional — when present it links the record
 * to a real Angico identity (normalized + deduped within the território).
 */
public record PessoaRequest(
        @NotBlank String workspaceId,
        @NotBlank String nome,
        String papel,
        String angicoId
) {
}
