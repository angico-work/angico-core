package com.angico.workspaces;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WorkspaceMemberRepository extends JpaRepository<WorkspaceMember, Long> {

    List<WorkspaceMember> findByWorkspaceIdOrderByJoinedAtAsc(String workspaceId);

    Optional<WorkspaceMember> findByWorkspaceIdAndActorId(String workspaceId, String actorId);

    List<WorkspaceMember> findByActorIdAndStatusOrderByJoinedAtAsc(String actorId, String status);

    Optional<WorkspaceMember> findByIdAndWorkspaceId(Long id, String workspaceId);
}
