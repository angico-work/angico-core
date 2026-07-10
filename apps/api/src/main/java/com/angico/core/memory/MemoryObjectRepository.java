package com.angico.core.memory;

import java.util.Optional;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MemoryObjectRepository extends JpaRepository<StoredMemoryObject, Long> {

    Optional<StoredMemoryObject> findByWorkspaceIdAndEntityTypeAndEntityId(
            String workspaceId, String entityType, String entityId);

    List<StoredMemoryObject> findByWorkspaceIdAndEntityTypeIgnoreCaseAndEntityId(
            String workspaceId, String entityType, String entityId);

    List<StoredMemoryObject> findByWorkspaceId(String workspaceId);

    long countByWorkspaceIdAndEntityType(String workspaceId, String entityType);

    long countByWorkspaceIdAndEntityTypeIgnoreCase(String workspaceId, String entityType);
}
