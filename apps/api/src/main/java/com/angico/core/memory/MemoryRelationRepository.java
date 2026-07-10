package com.angico.core.memory;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MemoryRelationRepository extends JpaRepository<StoredMemoryRelation, Long> {

    boolean existsByWorkspaceIdAndOriginTypeAndOriginIdAndDestinationTypeAndDestinationIdAndRelationTypeAndActiveTrue(
            String workspaceId,
            String originType,
            String originId,
            String destinationType,
            String destinationId,
            String relationType);

    List<StoredMemoryRelation> findByWorkspaceIdAndOriginTypeAndOriginIdAndDestinationTypeAndDestinationIdAndRelationTypeAndActiveTrue(
            String workspaceId,
            String originType,
            String originId,
            String destinationType,
            String destinationId,
            String relationType);

    List<StoredMemoryRelation> findByWorkspaceIdAndOriginTypeAndOriginIdAndRelationTypeAndActiveTrue(
            String workspaceId,
            String originType,
            String originId,
            String relationType);
}
