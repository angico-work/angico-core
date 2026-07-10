package com.angico.core.memory;

import java.util.List;
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
}
