package com.angico.missoes;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MissaoRepository extends JpaRepository<Missao, Long> {
    List<Missao> findByWorkspaceIdOrderByUpdatedAtDesc(String workspaceId);
    List<Missao> findByTerritorioIdOrderByUpdatedAtDesc(Long territorioId);
    long countByTerritorioId(Long territorioId);
    long countByTerritorioIdAndStatus(Long territorioId, String status);
}
