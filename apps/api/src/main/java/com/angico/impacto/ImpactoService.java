package com.angico.impacto;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

import com.angico.core.memory.MemoryEvent;
import com.angico.core.memory.MemoryRelationMetadata;
import com.angico.core.memory.OperationalMemoryService;
import com.angico.core.ontology.OntologyService;
import com.angico.common.ClockProvider;
import com.angico.common.ForbiddenException;
import com.angico.territorios.Territorio;
import com.angico.territorios.TerritorioService;
import com.angico.workspaces.WorkspaceAuthorizationService;
import com.angico.workspaces.WorkspaceReferenceValidator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.HashMap;

@Service
public class ImpactoService {

    private final IndicadorRepository indicadorRepository;
    private final MedicaoRepository medicaoRepository;
    private final TerritorioService territorioService;
    private final OperationalMemoryService memoryService;
    private final WorkspaceAuthorizationService authorizationService;
    private final WorkspaceReferenceValidator referenceValidator;
    private final ClockProvider clock;

    public ImpactoService(
            IndicadorRepository indicadorRepository,
            MedicaoRepository medicaoRepository,
            TerritorioService territorioService,
            OperationalMemoryService memoryService,
            WorkspaceAuthorizationService authorizationService,
            WorkspaceReferenceValidator referenceValidator,
            ClockProvider clock
    ) {
        this.indicadorRepository = indicadorRepository;
        this.medicaoRepository = medicaoRepository;
        this.territorioService = territorioService;
        this.memoryService = memoryService;
        this.authorizationService = authorizationService;
        this.referenceValidator = referenceValidator;
        this.clock = clock;
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
        String actorId = authorizationService.currentActorId();
        Territorio territorio = territorioService.requireTerritorio(request.territorioId());
        if (!workspaceId.equals(territorio.getWorkspaceId())) {
            throw new ForbiddenException("Território fora do workspace autorizado.");
        }
        Instant now = Instant.now();
        Indicador indicador = new Indicador();
        indicador.setWorkspaceId(territorio.getWorkspaceId());
        indicador.setTerritorioId(territorio.getId());
        indicador.setNome(TerritorioService.requireText(request.nome(), "nome").strip());
        indicador.setUnidade(TerritorioService.defaultText(request.unidade(), "un").strip());
        indicador.setDescricao(request.descricao() == null || request.descricao().isBlank()
                ? null : request.descricao().strip());
        indicador.setStatus("ATIVO");
        indicador.setCreatedAt(now);
        indicador.setUpdatedAt(now);
        indicador = indicadorRepository.save(indicador);

        memoryService.registrarObjeto(
                indicador.getWorkspaceId(),
                OntologyService.INDICADOR,
                String.valueOf(indicador.getId()),
                null,
                indicador.getNome(),
                indicador.getStatus(),
                "api"
        );
        Indicador indicadorSalvo = indicador;
        if (request.resultadoId() != null) {
            var resultado = referenceValidator.requireResultado(request.resultadoId(), workspaceId);
            memoryService.registrarRelacaoAtiva(
                            indicadorSalvo.getWorkspaceId(),
                            OntologyService.INDICADOR,
                            String.valueOf(indicadorSalvo.getId()),
                            OntologyService.RESULTADO,
                            String.valueOf(resultado.getId()),
                            "MEDE",
                            new MemoryRelationMetadata(
                                    "api", "Indicador mede resultado informado", actorId, null)
                    );
        }
        Map<String, Object> payload = new HashMap<>();
        payload.put("territorioId", territorio.getId());
        payload.put("nome", indicador.getNome());
        payload.put("unidade", indicador.getUnidade());
        if (request.resultadoId() != null) {
            payload.put("resultadoId", request.resultadoId());
        }
        memoryService.registrarEvento(new MemoryEvent(
                indicador.getWorkspaceId(),
                OntologyService.INDICADOR,
                String.valueOf(indicador.getId()),
                "indicador.criado",
                "api",
                actorId,
                null,
                null,
                null,
                1,
                now,
                payload
        ));
        return indicador;
    }

    @Transactional
    public Medicao createMedicao(MedicaoRequest request) {
        String workspaceId = authorizationService.requireAuthorizedWorkspace(request.workspaceId());
        double value = requireFiniteValue(request.valor());
        Indicador indicador = indicadorRepository.findById(request.indicadorId())
                .orElseThrow(() -> new IllegalArgumentException("Indicador nao encontrado: " + request.indicadorId()));
        if (!workspaceId.equals(indicador.getWorkspaceId())) {
            throw new ForbiddenException("Indicador fora do workspace autorizado.");
        }
        Instant now = clock.now();
        Medicao medicao = new Medicao();
        medicao.setWorkspaceId(indicador.getWorkspaceId());
        medicao.setIndicadorId(indicador.getId());
        medicao.setValor(value);
        medicao.setUnidade(TerritorioService.defaultText(request.unidade(), indicador.getUnidade()));
        medicao.setFonte(request.fonte());
        medicao.setActorId(authorizationService.currentActorId());
        medicao.setMeasuredAt(validateMeasuredAt(request.measuredAt(), now));
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
                new MemoryRelationMetadata(
                        "api", "Medicao registrada para indicador", medicao.getActorId(), null)
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

    private double requireFiniteValue(Double value) {
        if (value == null || !Double.isFinite(value)) {
            throw new IllegalArgumentException("valor deve ser um número finito.");
        }
        return value;
    }

    private Instant validateMeasuredAt(Instant requested, Instant now) {
        Instant value = requested == null ? now : requested;
        if (value.isBefore(Instant.parse("2000-01-01T00:00:00Z"))
                || value.isAfter(now.plus(5, ChronoUnit.MINUTES))) {
            throw new IllegalArgumentException("measuredAt está fora do intervalo permitido.");
        }
        return value;
    }
}
