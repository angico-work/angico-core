package com.angico.pessoas;

public record PessoaResponse(
        Long id,
        String workspaceId,
        String nome,
        String papel,
        String email,
        String angicoId,
        String status
) {
}
