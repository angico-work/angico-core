package com.angico.potencialidades;

import com.angico.core.memory.MemoryEvent;
import com.angico.core.memory.OperationalMemoryService;
import java.util.HashMap;
import java.util.Map;
import org.springframework.stereotype.Component;

/**
 * Traduz mudanças em potencialidades para a memória operacional do território:
 * registra o objeto, o evento e a relação com o território. É aqui que
 * "cada registro vira memória viva".
 */
@Component
public class PotencialidadeMemoryPublisher {

    static final String TIPO = "potencialidade";
    private static final String SOURCE = "web";
    private static final String RELACAO_TERRITORIO = "ocorre_em";
    private static final String TIPO_TERRITORIO = "territorio";

    private final OperationalMemoryService memory;

    public PotencialidadeMemoryPublisher(OperationalMemoryService memory) {
        this.memory = memory;
    }

    public void publicarRegistrada(PotencialidadeTerritorial p) {
        String entityId = String.valueOf(p.getId());

        memory.registrarObjeto(
                p.getWorkspaceId(), TIPO, entityId, null, p.getTitulo(), p.getStatus(), SOURCE);

        Map<String, Object> payload = new HashMap<>();
        payload.put("categoria", p.getCategoria());
        if (p.getLocalizacao() != null) {
            payload.put("localizacao", p.getLocalizacao());
        }
        payload.put("titulo", p.getTitulo());

        memory.registrarEvento(new MemoryEvent(
                p.getWorkspaceId(), TIPO, entityId, "potencialidade.registrada", SOURCE,
                p.getAutorId(), null, null, null, 1, p.getCreatedAt(), payload));

        if (p.getTerritorioId() != null && !p.getTerritorioId().isBlank()) {
            memory.registrarRelacaoAtiva(
                    p.getWorkspaceId(), TIPO, entityId,
                    TIPO_TERRITORIO, p.getTerritorioId(), RELACAO_TERRITORIO, SOURCE, null);
        }
    }
}
