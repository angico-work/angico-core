package com.angico.missoes;

import com.angico.core.memory.MemoryEvent;
import com.angico.core.memory.OperationalMemoryService;
import java.util.HashMap;
import java.util.Map;
import org.springframework.stereotype.Component;

/**
 * Traduz mudanças em missões para a memória operacional do território:
 * registra o objeto, o evento e as relações com o problema respondido e a
 * pessoa que a lidera.
 */
@Component
public class MissaoMemoryPublisher {

    static final String TIPO = "missao";
    private static final String SOURCE = "web";
    private static final String TIPO_PROBLEMA = "problema";
    private static final String TIPO_PESSOA = "pessoa";
    private static final String RELACAO_PROBLEMA = "responde_a";
    private static final String RELACAO_RESPONSAVEL = "liderada_por";

    private final OperationalMemoryService memory;

    public MissaoMemoryPublisher(OperationalMemoryService memory) {
        this.memory = memory;
    }

    public void publicarCriada(Missao m) {
        String entityId = String.valueOf(m.getId());

        memory.registrarObjeto(
                m.getWorkspaceId(), TIPO, entityId, null, m.getTitulo(), m.getStatus(), SOURCE);

        Map<String, Object> payload = new HashMap<>();
        payload.put("titulo", m.getTitulo());
        payload.put("status", m.getStatus());
        payload.put("progresso", m.getProgresso());

        memory.registrarEvento(new MemoryEvent(
                m.getWorkspaceId(), TIPO, entityId, "missao.criada", SOURCE,
                m.getResponsavelId(), null, null, null, 1, m.getCreatedAt(), payload));

        if (m.getProblemaId() != null && !m.getProblemaId().isBlank()) {
            memory.registrarRelacaoAtiva(
                    m.getWorkspaceId(), TIPO, entityId,
                    TIPO_PROBLEMA, m.getProblemaId(), RELACAO_PROBLEMA, SOURCE, null);
        }

        if (m.getResponsavelId() != null && !m.getResponsavelId().isBlank()) {
            memory.registrarRelacaoAtiva(
                    m.getWorkspaceId(), TIPO, entityId,
                    TIPO_PESSOA, m.getResponsavelId(), RELACAO_RESPONSAVEL, SOURCE, null);
        }
    }
}
