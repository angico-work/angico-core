package com.angico.impacto;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface IndicadorRepository extends JpaRepository<Indicador, Long> {
    List<Indicador> findByWorkspaceIdOrderByNomeAsc(String workspaceId);
    List<Indicador> findByTerritorioIdOrderByNomeAsc(Long territorioId);
}
