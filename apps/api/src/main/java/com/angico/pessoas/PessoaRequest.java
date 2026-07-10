package com.angico.pessoas;

import jakarta.validation.constraints.NotBlank;

public record PessoaRequest(
        @NotBlank String workspaceId,
        @NotBlank String nome,
        String papel,
        String angicoId
) {
}
