package com.angico.pessoas;

<<<<<<< HEAD
import java.time.Instant;

=======
>>>>>>> origin
public record PessoaResponse(
        Long id,
        String workspaceId,
        String nome,
        String papel,
<<<<<<< HEAD
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
=======
        String email,
        String angicoId,
        String status
) {
>>>>>>> origin
}
