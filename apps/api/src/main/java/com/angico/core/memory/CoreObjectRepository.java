package com.angico.core.memory;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CoreObjectRepository extends JpaRepository<CoreObject, Long> {
    Optional<CoreObject> findByWorkspaceIdAndEntityTypeAndEntityId(
            String workspaceId,
            String entityType,
            String entityId
    );

    List<CoreObject> findByWorkspaceId(String workspaceId);
}
