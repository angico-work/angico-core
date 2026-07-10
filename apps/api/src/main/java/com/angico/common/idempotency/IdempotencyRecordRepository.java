package com.angico.common.idempotency;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface IdempotencyRecordRepository extends JpaRepository<IdempotencyRecord, Long> {

    Optional<IdempotencyRecord> findByWorkspaceIdAndActorIdAndOperationKindAndIdempotencyKey(
            String workspaceId,
            String actorId,
            String operationKind,
            String idempotencyKey
    );
}
