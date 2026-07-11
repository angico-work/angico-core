package com.angico.organizacoes;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record OrganizacaoCreateRequest(
        @NotBlank @Size(max = 255) String workspaceId,
        @NotBlank @Size(max = 200) String nome,
        @NotBlank @Size(max = 40) String tipo,
        @Positive Long missaoId,
        @Size(max = 20) String missionRelation
) {
}
