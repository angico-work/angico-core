package com.angico.acoes;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AcaoRepository extends JpaRepository<Acao, Long> {
    List<Acao> findByWorkspaceIdOrderByUpdatedAtDesc(String workspaceId);
    List<Acao> findByTerritorioIdOrderByUpdatedAtDesc(Long territorioId);
    List<Acao> findByMissaoIdOrderByUpdatedAtDesc(Long missaoId);
    long countByTerritorioId(Long territorioId);
    long countByTerritorioIdAndStatus(Long territorioId, String status);
}
