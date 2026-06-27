package com.angico.observacoes;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ObservacaoRepository extends JpaRepository<ObservacaoTerritorial, Long> {
    List<ObservacaoTerritorial> findByWorkspaceIdOrderByCreatedAtDesc(String workspaceId);
    List<ObservacaoTerritorial> findByTerritorioIdOrderByCreatedAtDesc(Long territorioId);
    long countByTerritorioId(Long territorioId);
}
