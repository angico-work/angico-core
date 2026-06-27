package com.angico.observacoes;

import com.angico.core.memory.MemoryEvent;
import com.angico.core.memory.OperationalMemoryService;
import java.util.HashMap;
import java.util.Map;
import org.springframework.stereotype.Component;

/**
 * Traduz mudanças em observações para a memória operacional do território:
 * registra o objeto, o evento e a relação com o território. É aqui que
 * "cada registro vira memória viva".
 */
@Component
public class ObservacaoMemoryPublisher {

    static final String TIPO = "observacao";
    private static final String SOURCE = "web";
    private static final String RELACAO_TERRITORIO = "ocorre_em";
    private static final String TIPO_TERRITORIO = "territorio";

    private final OperationalMemoryService memory;

    public ObservacaoMemoryPublisher(OperationalMemoryService memory) {
        this.memory = memory;
    }

    public void publicarRegistrada(ObservacaoTerritorial o) {
        String entityId = String.valueOf(o.getId());

        memory.registrarObjeto(
                o.getWorkspaceId(), TIPO, entityId, null, o.getTitulo(), o.getStatus(), SOURCE);

        Map<String, Object> payload = new HashMap<>();
        payload.put("categoria", o.getCategoria());
        payload.put("urgencia", o.getUrgencia());
        if (o.getLocalizacao() != null) {
            payload.put("localizacao", o.getLocalizacao());
        }
        payload.put("titulo", o.getTitulo());

        memory.registrarEvento(new MemoryEvent(
                o.getWorkspaceId(), TIPO, entityId, "observacao.registrada", SOURCE,
                o.getAutorId(), null, null, null, 1, o.getCreatedAt(), payload));

        if (o.getTerritorioId() != null && !o.getTerritorioId().isBlank()) {
            memory.registrarRelacaoAtiva(
                    o.getWorkspaceId(), TIPO, entityId,
                    TIPO_TERRITORIO, o.getTerritorioId(), RELACAO_TERRITORIO, SOURCE, null);
        }
    }
}
