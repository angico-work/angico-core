package com.angico.territorios;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TerritorioRepository extends JpaRepository<Territorio, Long> {
    List<Territorio> findByWorkspaceIdOrderByNomeAsc(String workspaceId);
    Optional<Territorio> findFirstByWorkspaceIdOrderByIdAsc(String workspaceId);
}
