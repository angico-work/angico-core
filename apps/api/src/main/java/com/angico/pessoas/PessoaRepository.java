package com.angico.pessoas;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PessoaRepository extends JpaRepository<Pessoa, Long> {

    List<Pessoa> findByWorkspaceIdOrderByCreatedAtDesc(String workspaceId);

    long countByWorkspaceId(String workspaceId);

    // --- Auth finders (grafted from the dev auth slice) ---
    Optional<Pessoa> findByEmailIgnoreCase(String email);

    Optional<Pessoa> findByAngicoIdIgnoreCase(String angicoId);

    Optional<Pessoa> findByAuthTokenHash(String authTokenHash);
}
