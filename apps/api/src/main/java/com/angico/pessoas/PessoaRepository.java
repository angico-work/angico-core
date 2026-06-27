package com.angico.pessoas;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface PessoaRepository extends JpaRepository<Pessoa, Long> {
    List<Pessoa> findByWorkspaceIdOrderByNomeAsc(String workspaceId);

    Optional<Pessoa> findByEmailIgnoreCase(String email);

    Optional<Pessoa> findByAngicoIdIgnoreCase(String angicoId);

    Optional<Pessoa> findByWorkspaceIdAndEmailIgnoreCase(String workspaceId, String email);

    Optional<Pessoa> findByWorkspaceIdAndAngicoIdIgnoreCase(String workspaceId, String angicoId);

    Optional<Pessoa> findByAuthTokenHash(String authTokenHash);

    @Query("""
            select p from Pessoa p
            where p.workspaceId = :workspaceId
              and (
                lower(p.nome) like lower(concat('%', :query, '%'))
                or lower(p.email) like lower(concat('%', :query, '%'))
                or lower(p.angicoId) like lower(concat('%', :query, '%'))
              )
            order by p.nome asc
            """)
    List<Pessoa> searchByIdentity(String workspaceId, String query);
}
