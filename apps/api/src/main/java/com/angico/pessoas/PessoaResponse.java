package com.angico.pessoas;

import java.time.Instant;

public record PessoaResponse(
        Long id,
        String workspaceId,
        String nome,
        String papel,
        Instant createdAt
) {

    public static PessoaResponse from(Pessoa p) {
        return new PessoaResponse(
                p.getId(),
                p.getWorkspaceId(),
                p.getNome(),
                p.getPapel(),
                p.getCreatedAt()
        );
    }
}
