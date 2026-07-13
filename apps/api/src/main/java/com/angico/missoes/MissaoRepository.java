package com.angico.missoes;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MissaoRepository extends JpaRepository<Missao, Long> {

    List<Missao> findByWorkspaceIdOrderByCreatedAtDesc(String workspaceId);

    List<Missao> findTop6ByWorkspaceIdOrderByCreatedAtDesc(String workspaceId);

    long countByWorkspaceId(String workspaceId);
}
