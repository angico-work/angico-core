package com.angico.core.memory;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CoreEntityStateRepository extends JpaRepository<CoreEntityState, Long> {
    Optional<CoreEntityState> findByWorkspaceIdAndEntityTypeAndEntityId(
            String workspaceId,
            String entityType,
            String entityId
    );
}
