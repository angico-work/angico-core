package com.angico.problemas;

import com.angico.core.memory.MemoryEvent;
import com.angico.core.memory.OperationalMemoryService;
import java.util.HashMap;
import java.util.Map;
import org.springframework.stereotype.Component;

/**
 * Traduz mudanças em problemas socioambientais para a memória operacional do
 * território: registra o objeto, o evento e a relação com a observação de
 * origem. É aqui que "cada registro vira memória viva".
 */
@Component
public class ProblemaMemoryPublisher {

    static final String TIPO = "problema";
    private static final String SOURCE = "web";
    private static final String RELACAO_ORIGEM = "origina_de";
    private static final String TIPO_OBSERVACAO = "observacao";

    private final OperationalMemoryService memory;

    public ProblemaMemoryPublisher(OperationalMemoryService memory) {
        this.memory = memory;
    }

    public void publicarRegistrado(ProblemaSocioambiental p) {
        String entityId = String.valueOf(p.getId());

        memory.registrarObjeto(
                p.getWorkspaceId(), TIPO, entityId, null, p.getTitulo(), p.getStatus(), SOURCE);

        Map<String, Object> payload = new HashMap<>();
        payload.put("categoria", p.getCategoria());
        payload.put("severidade", p.getSeveridade());
        if (p.getLocalizacao() != null) {
            payload.put("localizacao", p.getLocalizacao());
        }
        payload.put("titulo", p.getTitulo());

        memory.registrarEvento(new MemoryEvent(
                p.getWorkspaceId(), TIPO, entityId, "problema.registrado", SOURCE,
                p.getAutorId(), null, null, null, 1, p.getCreatedAt(), payload));

        if (p.getOrigemObservacaoId() != null && !p.getOrigemObservacaoId().isBlank()) {
            memory.registrarRelacaoAtiva(
                    p.getWorkspaceId(), TIPO, entityId,
                    TIPO_OBSERVACAO, p.getOrigemObservacaoId(), RELACAO_ORIGEM, SOURCE, null);
        }
    }
}
