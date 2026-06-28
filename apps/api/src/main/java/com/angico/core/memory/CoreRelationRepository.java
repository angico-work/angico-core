package com.angico.core.memory;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CoreRelationRepository extends JpaRepository<CoreRelation, Long> {
    Optional<CoreRelation> findByWorkspaceIdAndOriginTypeAndOriginIdAndDestinationTypeAndDestinationIdAndRelationTypeAndEndedAtIsNull(
            String workspaceId,
            String originType,
            String originId,
            String destinationType,
            String destinationId,
            String relationType
    );

    List<CoreRelation> findByWorkspaceIdAndOriginTypeAndOriginIdAndRelationTypeAndEndedAtIsNull(
            String workspaceId,
            String originType,
            String originId,
            String relationType
    );

    @Query("""
            select r from CoreRelation r
            where r.workspaceId = :workspaceId
              and r.endedAt is null
              and (
                (r.originType = :entityType and r.originId = :entityId)
                or
                (r.destinationType = :entityType and r.destinationId = :entityId)
              )
            """)
    List<CoreRelation> findActiveRelationsForNode(
            @Param("workspaceId") String workspaceId,
            @Param("entityType") String entityType,
            @Param("entityId") String entityId
    );

    List<CoreRelation> findByWorkspaceIdAndEndedAtIsNull(String workspaceId);
}
