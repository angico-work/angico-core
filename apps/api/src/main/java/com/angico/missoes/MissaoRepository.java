package com.angico.missoes;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MissaoRepository extends JpaRepository<Missao, Long> {
<<<<<<< HEAD

    List<Missao> findByWorkspaceIdOrderByCreatedAtDesc(String workspaceId);

    long countByWorkspaceId(String workspaceId);
=======
    List<Missao> findByWorkspaceIdOrderByUpdatedAtDesc(String workspaceId);
    List<Missao> findByTerritorioIdOrderByUpdatedAtDesc(Long territorioId);
    long countByTerritorioId(Long territorioId);
    long countByTerritorioIdAndStatus(Long territorioId, String status);
>>>>>>> origin
}
