package com.angico.mensagens;

import java.util.List;

public record ConversaRequest(
        String workspaceId,
        Long territorioId,
        String contextEntityType,
        String contextEntityId,
        String titulo,
        List<Long> participanteIds,
        List<String> participanteRefs
) {
}
