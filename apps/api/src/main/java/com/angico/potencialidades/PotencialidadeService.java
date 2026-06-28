package com.angico.potencialidades;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import com.angico.core.memory.MemoryEvent;
import com.angico.core.memory.OperationalMemoryService;
import com.angico.territorios.Territorio;
import com.angico.territorios.TerritorioService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PotencialidadeService {

    private final PotencialidadeRepository potencialidadeRepository;
    private final TerritorioService territorioService;
    private final OperationalMemoryService memoryService;

    public PotencialidadeService(
            PotencialidadeRepository potencialidadeRepository,
            TerritorioService territorioService,
            OperationalMemoryService memoryService
    ) {
        this.potencialidadeRepository = potencialidadeRepository;
        this.territorioService = territorioService;
        this.memoryService = memoryService;
    }

    public List<PotencialidadeResponse> list(String workspaceId) {
        return potencialidadeRepository.findByWorkspaceIdOrderByUpdatedAtDesc(TerritorioService.workspace(workspaceId))
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public PotencialidadeResponse create(PotencialidadeRequest request) {
        Territorio territorio = territorioService.requireTerritorio(request.territorioId());
        return toResponse(createForObservation(
                territorio,
                request.observacaoId(),
                request.titulo(),
                request.descricao(),
                request.categoria(),
                request.prioridade(),
                request.latitude(),
                request.longitude(),
                request.actorId()
        ));
    }

    @Transactional
    public PotencialidadeTerritorial createForObservation(
            Territorio territorio,
            Long observacaoId,
            String titulo,
            String descricao,
            String categoria,
            Integer prioridade,
            Double latitude,
            Double longitude,
            String actorId
    ) {
        Instant now = Instant.now();
        PotencialidadeTerritorial potencialidade = new PotencialidadeTerritorial();
        potencialidade.setWorkspaceId(territorio.getWorkspaceId());
        potencialidade.setTerritorioId(territorio.getId());
        potencialidade.setObservacaoId(observacaoId);
        potencialidade.setTitulo(TerritorioService.requireText(titulo, "titulo"));
        potencialidade.setDescricao(descricao);
        potencialidade.setCategoria(TerritorioService.defaultText(categoria, "Outro"));
        potencialidade.setStatus("REGISTRADA");
        potencialidade.setPrioridade(prioridade == null ? 2 : prioridade);
        potencialidade.setLatitude(latitude == null ? territorio.getLatitude() : latitude);
        potencialidade.setLongitude(longitude == null ? territorio.getLongitude() : longitude);
        potencialidade.setCreatedAt(now);
        potencialidade.setUpdatedAt(now);
        potencialidade = potencialidadeRepository.save(potencialidade);

        String potencialidadeId = String.valueOf(potencialidade.getId());
        memoryService.registrarObjeto(
                potencialidade.getWorkspaceId(),
                "POTENCIALIDADE",
                potencialidadeId,
                null,
                potencialidade.getTitulo(),
                potencialidade.getStatus(),
                "api"
        );
        memoryService.registrarRelacaoAtiva(
                potencialidade.getWorkspaceId(),
                "POTENCIALIDADE",
                potencialidadeId,
                "TERRITORIO",
                String.valueOf(territorio.getId()),
                "EXISTE_EM",
                "api",
                "Potencialidade localizada no território"
        );
        memoryService.registrarEvento(new MemoryEvent(
                potencialidade.getWorkspaceId(),
                "POTENCIALIDADE",
                potencialidadeId,
                "POTENCIALIDADE_REGISTRADA",
                "api",
                actorId,
                null,
                null,
                null,
                1,
                now,
                Map.of("titulo", potencialidade.getTitulo(), "territorioId", territorio.getId())
        ));

        return potencialidade;
    }

    private PotencialidadeResponse toResponse(PotencialidadeTerritorial potencialidade) {
        return new PotencialidadeResponse(
                potencialidade.getId(),
                potencialidade.getWorkspaceId(),
                potencialidade.getTerritorioId(),
                potencialidade.getObservacaoId(),
                potencialidade.getTitulo(),
                potencialidade.getDescricao(),
                potencialidade.getCategoria(),
                potencialidade.getStatus(),
                potencialidade.getPrioridade(),
                potencialidade.getLatitude(),
                potencialidade.getLongitude(),
                potencialidade.getUpdatedAt()
        );
    }
}
