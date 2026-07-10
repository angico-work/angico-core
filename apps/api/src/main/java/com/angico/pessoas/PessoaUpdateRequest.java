package com.angico.pessoas;

public record PessoaUpdateRequest(
        String nome,
        String telefone,
        String foto
) {
}
