package com.angico.acoes;

import com.angico.core.memory.MemoryEvent;
import com.angico.core.memory.OperationalMemoryService;
import java.util.HashMap;
import java.util.Map;
import org.springframework.stereotype.Component;

/**
 * Traduz mudanças em ações para a memória operacional: registra o objeto, o
 * evento e as relações com a missão (parte_de) e com o responsável
 * (liderada_por). É aqui que cada ação iniciada vira memória viva.
 */
@Component
public class AcaoMemoryPublisher {

    static final String TIPO = "acao";
    private static final String SOURCE = "web";
    private static final String RELACAO_MISSAO = "parte_de";
    private static final String TIPO_MISSAO = "missao";
    private static final String RELACAO_RESPONSAVEL = "liderada_por";
    private static final String TIPO_PESSOA = "pessoa";

    private final OperationalMemoryService memory;

    public AcaoMemoryPublisher(OperationalMemoryService memory) {
        this.memory = memory;
    }

    public void publicarIniciada(Acao a, String actorId) {
        String entityId = String.valueOf(a.getId());

        memory.registrarObjeto(
                a.getWorkspaceId(), TIPO, entityId, null, a.getTitulo(), a.getStatus(), SOURCE);

        Map<String, Object> payload = new HashMap<>();
        payload.put("titulo", a.getTitulo());
        payload.put("status", a.getStatus());

        memory.registrarEvento(new MemoryEvent(
                a.getWorkspaceId(), TIPO, entityId, "acao.iniciada", SOURCE,
                actorId, null, null, null, 1, a.getCreatedAt(), payload));

        if (a.getMissaoId() != null && !a.getMissaoId().isBlank()) {
            memory.registrarRelacaoAtiva(
                    a.getWorkspaceId(), TIPO, entityId,
                    TIPO_MISSAO, a.getMissaoId(), RELACAO_MISSAO, SOURCE, null);
        }

        if (a.getResponsavelId() != null && !a.getResponsavelId().isBlank()) {
            memory.registrarRelacaoAtiva(
                    a.getWorkspaceId(), TIPO, entityId,
                    TIPO_PESSOA, a.getResponsavelId(), RELACAO_RESPONSAVEL, SOURCE, null);
        }
    }
}
