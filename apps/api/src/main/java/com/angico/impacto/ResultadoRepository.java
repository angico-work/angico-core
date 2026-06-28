package com.angico.impacto;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ResultadoRepository extends JpaRepository<Resultado, Long> {
    List<Resultado> findByWorkspaceIdOrderByCreatedAtDesc(String workspaceId);
    List<Resultado> findByAcaoIdOrderByCreatedAtDesc(Long acaoId);
}
