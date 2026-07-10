package com.angico.pessoas;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface PessoaRepository extends JpaRepository<Pessoa, Long> {

    List<Pessoa> findByWorkspaceIdOrderByCreatedAtDesc(String workspaceId);

    long countByWorkspaceId(String workspaceId);

    Optional<Pessoa> findByEmailIgnoreCase(String email);

    Optional<Pessoa> findByAngicoIdIgnoreCase(String angicoId);

    Optional<Pessoa> findByAuthTokenHash(String authTokenHash);

    // Workspace-scoped lookups used by the mensagens module to resolve participants.
    Optional<Pessoa> findByWorkspaceIdAndAngicoIdIgnoreCase(String workspaceId, String angicoId);

    Optional<Pessoa> findByWorkspaceIdAndEmailIgnoreCase(String workspaceId, String email);

    // Angico-ID-aware lookup for the "Nova pessoa" autocomplete: matches the
    // typed text against either the Angico ID or the name, scoped to the workspace.
    @Query("select p from Pessoa p where p.workspaceId = :ws and ("
            + "lower(coalesce(p.angicoId, '')) like lower(concat('%', :q, '%')) "
            + "or lower(p.nome) like lower(concat('%', :q, '%'))) order by p.nome asc")
    List<Pessoa> searchInWorkspace(@Param("ws") String ws, @Param("q") String q);
}
