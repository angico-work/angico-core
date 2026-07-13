package com.angico.offline;

import com.angico.common.idempotency.IdempotencyOperation;

public record OfflineMutationReceipt(
        IdempotencyOperation operation,
        String workspaceId,
        String clientMutationId,
        String resourceId
) {
}
