package com.angico.core.memory;

import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface MemoryEventRepository extends JpaRepository<StoredMemoryEvent, Long>,
        JpaSpecificationExecutor<StoredMemoryEvent> {

    long countByWorkspaceIdAndEntityTypeIgnoreCaseAndEntityIdAndSequenceLessThanEqual(
            String workspaceId, String entityType, String entityId, Long sequence);

    List<StoredMemoryEvent> findByWorkspaceIdOrderBySequenceAsc(String workspaceId);

    List<StoredMemoryEvent> findTop100ByWorkspaceIdOrderBySequenceDesc(String workspaceId);

    @Query("""
            select e from StoredMemoryEvent e
            where e.workspaceId = :workspaceId
              and upper(e.entityType) = upper(:entityType)
              and e.entityId = :entityId
            order by e.occurredAt asc, e.recordedAt asc, e.sequence asc
            """)
    List<StoredMemoryEvent> findEventsForNode(
            @Param("workspaceId") String workspaceId,
            @Param("entityType") String entityType,
            @Param("entityId") String entityId,
            Pageable pageable);

    boolean existsByWorkspaceIdAndEntityTypeIgnoreCaseAndEntityId(
            String workspaceId, String entityType, String entityId);

    @Query("""
            select (count(e) > 0) from StoredMemoryEvent e
            where e.workspaceId = :workspaceId
              and upper(e.entityType) = upper(:entityType)
              and e.entityId = :entityId
              and e.actorId is not null
              and e.actorId <> ''
            """)
    boolean existsAuthoredEvent(
            @Param("workspaceId") String workspaceId,
            @Param("entityType") String entityType,
            @Param("entityId") String entityId);
}
