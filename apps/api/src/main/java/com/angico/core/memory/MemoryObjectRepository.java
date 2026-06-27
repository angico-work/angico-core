package com.angico.core.memory;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MemoryObjectRepository extends JpaRepository<StoredMemoryObject, Long> {

    Optional<StoredMemoryObject> findByWorkspaceIdAndEntityTypeAndEntityId(
            String workspaceId, String entityType, String entityId);

    long countByWorkspaceIdAndEntityType(String workspaceId, String entityType);
}
