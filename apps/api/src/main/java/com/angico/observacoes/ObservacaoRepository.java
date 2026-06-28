package com.angico.observacoes;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ObservacaoRepository extends JpaRepository<ObservacaoTerritorial, Long> {
<<<<<<< HEAD

    List<ObservacaoTerritorial> findByWorkspaceIdOrderByCreatedAtDesc(String workspaceId);

    long countByWorkspaceId(String workspaceId);
=======
    List<ObservacaoTerritorial> findByWorkspaceIdOrderByCreatedAtDesc(String workspaceId);
    List<ObservacaoTerritorial> findByTerritorioIdOrderByCreatedAtDesc(Long territorioId);
    long countByTerritorioId(Long territorioId);
>>>>>>> origin
}
