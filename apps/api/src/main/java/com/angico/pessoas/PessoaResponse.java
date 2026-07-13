package com.angico.pessoas;

import java.time.Instant;

public record PessoaResponse(
        Long id,
        String workspaceId,
        String nome,
        String papel,
        String angicoId,
        String telefone,
        String foto,
        Instant createdAt
) {

    public static PessoaResponse from(Pessoa p) {
        return inWorkspace(p, p.getWorkspaceId());
    }

    public static PessoaResponse inWorkspace(Pessoa p, String workspaceId) {
        return new PessoaResponse(
                p.getId(),
                workspaceId,
                p.getNome(),
                p.getPapel(),
                p.getAngicoId(),
                p.getTelefone(),
                p.getFoto(),
                p.getCreatedAt()
        );
    }
}
