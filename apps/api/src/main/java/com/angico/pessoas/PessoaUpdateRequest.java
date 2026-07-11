package com.angico.pessoas;

import jakarta.validation.constraints.Size;

public record PessoaUpdateRequest(
        @Size(max = 255) String nome,
        @Size(max = 50) String telefone,
        @Size(max = 500_000) String foto
) {
}
