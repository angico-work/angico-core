package com.angico.observacoes;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ObservacaoRepository extends JpaRepository<ObservacaoTerritorial, Long> {

    List<ObservacaoTerritorial> findByWorkspaceIdOrderByCreatedAtDesc(String workspaceId);

    List<ObservacaoTerritorial> findTop8ByWorkspaceIdOrderByCreatedAtDesc(String workspaceId);

    @Query("""
            select o.categoria as category, count(o) as total
            from ObservacaoTerritorial o
            where o.workspaceId = :workspaceId
            group by o.categoria
            order by count(o) desc, o.categoria asc
            """)
    List<ObservacaoCategoryCount> countByCategory(@Param("workspaceId") String workspaceId);

    Optional<ObservacaoTerritorial> findByIdAndWorkspaceId(Long id, String workspaceId);

    Optional<ObservacaoTerritorial> findByWorkspaceIdAndClientMutationId(
            String workspaceId, String clientMutationId);

    long countByWorkspaceId(String workspaceId);
}
