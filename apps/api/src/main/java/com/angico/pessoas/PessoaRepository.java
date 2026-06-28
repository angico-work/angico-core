package com.angico.pessoas;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface PessoaRepository extends JpaRepository<Pessoa, Long> {
<<<<<<< HEAD

    List<Pessoa> findByWorkspaceIdOrderByCreatedAtDesc(String workspaceId);

    long countByWorkspaceId(String workspaceId);

    // --- Auth finders (grafted from the dev auth slice) ---
=======
    List<Pessoa> findByWorkspaceIdOrderByNomeAsc(String workspaceId);

>>>>>>> origin
    Optional<Pessoa> findByEmailIgnoreCase(String email);

    Optional<Pessoa> findByAngicoIdIgnoreCase(String angicoId);

<<<<<<< HEAD
    Optional<Pessoa> findByAuthTokenHash(String authTokenHash);
=======
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
>>>>>>> origin
}
