package com.angico.pessoas;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record PessoaRequest(
        @NotBlank @Size(max = 255) String workspaceId,
        @NotBlank @Size(max = 255) String nome,
        @Size(max = 255) String papel,
        @Pattern(regexp = "@?[A-Za-z0-9._]{3,30}") String angicoId
) {
}
