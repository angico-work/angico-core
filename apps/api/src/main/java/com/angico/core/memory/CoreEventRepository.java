package com.angico.core.memory;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CoreEventRepository extends JpaRepository<CoreEvent, String> {
    List<CoreEvent> findByWorkspaceIdOrderByCommitSequenceAsc(String workspaceId);
    List<CoreEvent> findByWorkspaceIdAndEntityTypeAndEntityIdOrderByCommitSequenceAsc(
            String workspaceId,
            String entityType,
            String entityId
    );
}
