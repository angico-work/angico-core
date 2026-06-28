package com.angico.impacto;

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
public class ImpactoService {

    private final IndicadorRepository indicadorRepository;
    private final MedicaoRepository medicaoRepository;
    private final ResultadoRepository resultadoRepository;
    private final TerritorioService territorioService;
    private final OperationalMemoryService memoryService;

    public ImpactoService(
            IndicadorRepository indicadorRepository,
            MedicaoRepository medicaoRepository,
            ResultadoRepository resultadoRepository,
            TerritorioService territorioService,
            OperationalMemoryService memoryService
    ) {
        this.indicadorRepository = indicadorRepository;
        this.medicaoRepository = medicaoRepository;
        this.resultadoRepository = resultadoRepository;
        this.territorioService = territorioService;
        this.memoryService = memoryService;
    }

    public List<Indicador> indicadores(String workspaceId) {
        return indicadorRepository.findByWorkspaceIdOrderByNomeAsc(TerritorioService.workspace(workspaceId));
    }

    public List<Medicao> medicoes(String workspaceId) {
        return medicaoRepository.findByWorkspaceIdOrderByCreatedAtDesc(TerritorioService.workspace(workspaceId));
    }

    @Transactional
    public Indicador createIndicador(IndicadorRequest request) {
        Territorio territorio = territorioService.requireTerritorio(request.territorioId());
        Instant now = Instant.now();
        Indicador indicador = new Indicador();
        indicador.setWorkspaceId(territorio.getWorkspaceId());
        indicador.setTerritorioId(territorio.getId());
        indicador.setNome(TerritorioService.requireText(request.nome(), "nome"));
        indicador.setUnidade(TerritorioService.defaultText(request.unidade(), "un"));
        indicador.setDescricao(request.descricao());
        indicador.setStatus("ATIVO");
        indicador.setCreatedAt(now);
        indicador.setUpdatedAt(now);
        indicador = indicadorRepository.save(indicador);

        memoryService.registrarObjeto(
                indicador.getWorkspaceId(),
                "INDICADOR",
                String.valueOf(indicador.getId()),
                null,
                indicador.getNome(),
                indicador.getStatus(),
                "api"
        );
        Indicador indicadorSalvo = indicador;
        if (request.resultadoId() != null) {
            resultadoRepository.findById(request.resultadoId()).ifPresent(resultado ->
                    memoryService.registrarRelacaoAtiva(
                            indicadorSalvo.getWorkspaceId(),
                            "INDICADOR",
                            String.valueOf(indicadorSalvo.getId()),
                            "RESULTADO",
                            String.valueOf(resultado.getId()),
                            "MEDE",
                            "api",
                            "Indicador mede resultado informado"
                    )
            );
        }
        return indicador;
    }

    @Transactional
    public Medicao createMedicao(MedicaoRequest request) {
        Indicador indicador = indicadorRepository.findById(request.indicadorId())
                .orElseThrow(() -> new IllegalArgumentException("Indicador não encontrado: " + request.indicadorId()));
        Instant now = Instant.now();
        Medicao medicao = new Medicao();
        medicao.setWorkspaceId(indicador.getWorkspaceId());
        medicao.setIndicadorId(indicador.getId());
        medicao.setValor(request.valor());
        medicao.setUnidade(TerritorioService.defaultText(request.unidade(), indicador.getUnidade()));
        medicao.setFonte(request.fonte());
        medicao.setActorId(request.actorId());
        medicao.setMeasuredAt(request.measuredAt() == null ? now : request.measuredAt());
        medicao.setCreatedAt(now);
        medicao = medicaoRepository.save(medicao);

        memoryService.registrarObjeto(
                medicao.getWorkspaceId(),
                "MEDICAO",
                String.valueOf(medicao.getId()),
                null,
                "Medição de " + indicador.getNome(),
                "REGISTRADA",
                "api"
        );
        memoryService.registrarRelacaoAtiva(
                medicao.getWorkspaceId(),
                "MEDICAO",
                String.valueOf(medicao.getId()),
                "INDICADOR",
                String.valueOf(indicador.getId()),
                "REFERE_SE_A",
                "api",
                "Medição registrada para indicador"
        );
        memoryService.registrarEvento(new MemoryEvent(
                medicao.getWorkspaceId(),
                "MEDICAO",
                String.valueOf(medicao.getId()),
                "MEDICAO_REGISTRADA",
                "api",
                medicao.getActorId(),
                null,
                null,
                null,
                1,
                now,
                Map.of(
                        "indicadorId", indicador.getId(),
                        "valor", medicao.getValor(),
                        "unidade", medicao.getUnidade()
                )
        ));

        return medicao;
    }
}
