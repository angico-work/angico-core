package com.angico.core.memory;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MemoryEventRepository extends JpaRepository<StoredMemoryEvent, Long> {

    long countByWorkspaceIdAndEntityTypeAndEntityId(String workspaceId, String entityType, String entityId);

    List<StoredMemoryEvent> findTop100ByWorkspaceIdOrderBySequenceDesc(String workspaceId);
}
