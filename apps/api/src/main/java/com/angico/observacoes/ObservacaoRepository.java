package com.angico.observacoes;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ObservacaoRepository extends JpaRepository<ObservacaoTerritorial, Long> {

    List<ObservacaoTerritorial> findByWorkspaceIdOrderByCreatedAtDesc(String workspaceId);

    Optional<ObservacaoTerritorial> findByIdAndWorkspaceId(Long id, String workspaceId);

    Optional<ObservacaoTerritorial> findByWorkspaceIdAndClientMutationId(
            String workspaceId, String clientMutationId);

    long countByWorkspaceId(String workspaceId);
}
