package com.angico.potencialidades;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PotencialidadeRepository extends JpaRepository<PotencialidadeTerritorial, Long> {

    List<PotencialidadeTerritorial> findByWorkspaceIdOrderByCreatedAtDesc(String workspaceId);

    long countByWorkspaceId(String workspaceId);
}
