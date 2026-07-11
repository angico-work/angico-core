package com.angico.impacto;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MedicaoRepository extends JpaRepository<Medicao, Long> {
    List<Medicao> findByWorkspaceIdOrderByCreatedAtDesc(String workspaceId);
    List<Medicao> findTop64ByWorkspaceIdOrderByCreatedAtDesc(String workspaceId);
    List<Medicao> findByIndicadorIdOrderByCreatedAtDesc(Long indicadorId);
    long countByWorkspaceId(String workspaceId);
}
