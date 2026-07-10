package com.angico.impacto;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import com.angico.core.memory.MemoryEvent;
import com.angico.core.memory.OperationalMemoryService;
import com.angico.common.ForbiddenException;
import com.angico.territorios.Territorio;
import com.angico.territorios.TerritorioService;
import com.angico.workspaces.WorkspaceAuthorizationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ImpactoService {

    private final IndicadorRepository indicadorRepository;
    private final MedicaoRepository medicaoRepository;
    private final ResultadoRepository resultadoRepository;
    private final TerritorioService territorioService;
    private final OperationalMemoryService memoryService;
    private final WorkspaceAuthorizationService authorizationService;

    public ImpactoService(
            IndicadorRepository indicadorRepository,
            MedicaoRepository medicaoRepository,
            ResultadoRepository resultadoRepository,
            TerritorioService territorioService,
            OperationalMemoryService memoryService,
            WorkspaceAuthorizationService authorizationService
    ) {
        this.indicadorRepository = indicadorRepository;
        this.medicaoRepository = medicaoRepository;
        this.resultadoRepository = resultadoRepository;
        this.territorioService = territorioService;
        this.memoryService = memoryService;
        this.authorizationService = authorizationService;
    }

    public List<Indicador> indicadores(String workspaceId) {
        String authorized = authorizationService.requireAuthorizedWorkspace(workspaceId);
        return indicadorRepository.findByWorkspaceIdOrderByNomeAsc(authorized);
    }

    public List<Medicao> medicoes(String workspaceId) {
        String authorized = authorizationService.requireAuthorizedWorkspace(workspaceId);
        return medicaoRepository.findByWorkspaceIdOrderByCreatedAtDesc(authorized);
    }

    @Transactional
    public Indicador createIndicador(IndicadorRequest request) {
        String workspaceId = authorizationService.requireAuthorizedWorkspace(request.workspaceId());
        Territorio territorio = territorioService.requireTerritorio(request.territorioId());
        if (!workspaceId.equals(territorio.getWorkspaceId())) {
            throw new ForbiddenException("Território fora do workspace autorizado.");
        }
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
            resultadoRepository.findById(request.resultadoId()).ifPresent(resultado -> {
                if (!workspaceId.equals(resultado.getWorkspaceId())) {
                    throw new ForbiddenException("Resultado fora do workspace autorizado.");
                }
                    memoryService.registrarRelacaoAtiva(
                            indicadorSalvo.getWorkspaceId(),
                            "INDICADOR",
                            String.valueOf(indicadorSalvo.getId()),
                            "RESULTADO",
                            String.valueOf(resultado.getId()),
                            "MEDE",
                            "api",
                            "Indicador mede resultado informado"
                    );
            });
        }
        return indicador;
    }

    @Transactional
    public Medicao createMedicao(MedicaoRequest request) {
        String workspaceId = authorizationService.requireAuthorizedWorkspace(request.workspaceId());
        Indicador indicador = indicadorRepository.findById(request.indicadorId())
                .orElseThrow(() -> new IllegalArgumentException("Indicador nao encontrado: " + request.indicadorId()));
        if (!workspaceId.equals(indicador.getWorkspaceId())) {
            throw new ForbiddenException("Indicador fora do workspace autorizado.");
        }
        Instant now = Instant.now();
        Medicao medicao = new Medicao();
        medicao.setWorkspaceId(indicador.getWorkspaceId());
        medicao.setIndicadorId(indicador.getId());
        medicao.setValor(request.valor());
        medicao.setUnidade(TerritorioService.defaultText(request.unidade(), indicador.getUnidade()));
        medicao.setFonte(request.fonte());
        medicao.setActorId(authorizationService.currentActorId());
        medicao.setMeasuredAt(request.measuredAt() == null ? now : request.measuredAt());
        medicao.setCreatedAt(now);
        medicao = medicaoRepository.save(medicao);

        memoryService.registrarObjeto(
                medicao.getWorkspaceId(),
                "MEDICAO",
                String.valueOf(medicao.getId()),
                null,
                "Medicao de " + indicador.getNome(),
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
                "Medicao registrada para indicador"
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
