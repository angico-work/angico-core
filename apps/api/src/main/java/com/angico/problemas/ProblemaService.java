package com.angico.problemas;

<<<<<<< HEAD
import com.angico.common.ClockProvider;
import java.util.List;
=======
import java.time.Instant;
import java.util.List;
import java.util.Map;

import com.angico.core.memory.MemoryEvent;
import com.angico.core.memory.OperationalMemoryService;
import com.angico.territorios.Territorio;
import com.angico.territorios.TerritorioService;
>>>>>>> origin
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProblemaService {

    private static final String STATUS_INICIAL = "ABERTO";
    private static final String SEVERIDADE_PADRAO = "MEDIA";

    private final ProblemaRepository problemaRepository;
<<<<<<< HEAD
    private final ProblemaMemoryPublisher problemaMemoryPublisher;
    private final ClockProvider clock;

    public ProblemaService(
            ProblemaRepository problemaRepository,
            ProblemaMemoryPublisher problemaMemoryPublisher,
            ClockProvider clock
    ) {
        this.problemaRepository = problemaRepository;
        this.problemaMemoryPublisher = problemaMemoryPublisher;
        this.clock = clock;
    }

    /**
     * Registra um problema socioambiental e o inscreve na memória do território
     * (objeto + evento + eventual relação com a observação de origem).
     * Persistência e memória commitam juntas na mesma transação.
     */
    @Transactional
    public ProblemaResponse registrar(ProblemaRequest request) {
        ProblemaSocioambiental problema = new ProblemaSocioambiental(
                request.workspaceId(),
                request.territorioId(),
                request.categoria(),
                request.titulo(),
                request.descricao(),
                request.localizacao(),
                request.latitude(),
                request.longitude(),
                request.severidade() == null || request.severidade().isBlank()
                        ? SEVERIDADE_PADRAO : request.severidade(),
                STATUS_INICIAL,
                request.origemObservacaoId(),
                request.autorId(),
                clock.now()
        );

        ProblemaSocioambiental saved = problemaRepository.save(problema);
        problemaMemoryPublisher.publicarRegistrado(saved);
        return ProblemaResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<ProblemaResponse> listar(String workspaceId) {
        return problemaRepository.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId)
                .stream()
                .map(ProblemaResponse::from)
                .toList();
=======
    private final TerritorioService territorioService;
    private final OperationalMemoryService memoryService;

    public ProblemaService(
            ProblemaRepository problemaRepository,
            TerritorioService territorioService,
            OperationalMemoryService memoryService
    ) {
        this.problemaRepository = problemaRepository;
        this.territorioService = territorioService;
        this.memoryService = memoryService;
    }

    public List<ProblemaResponse> list(String workspaceId) {
        return problemaRepository.findByWorkspaceIdOrderByUpdatedAtDesc(TerritorioService.workspace(workspaceId))
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public ProblemaResponse get(Long id) {
        return toResponse(requireProblema(id));
    }

    public ProblemaSocioambiental requireProblema(Long id) {
        return problemaRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Problema nao encontrado: " + id));
    }

    @Transactional
    public ProblemaResponse create(ProblemaRequest request) {
        Territorio territorio = territorioService.requireTerritorio(request.territorioId());
        return toResponse(createForObservation(
                territorio,
                request.observacaoId(),
                request.titulo(),
                request.descricao(),
                request.categoria(),
                request.prioridade(),
                request.severidade(),
                request.latitude(),
                request.longitude(),
                request.actorId()
        ));
    }

    @Transactional
    public ProblemaSocioambiental createForObservation(
            Territorio territorio,
            Long observacaoId,
            String titulo,
            String descricao,
            String categoria,
            String prioridade,
            Integer severidade,
            Double latitude,
            Double longitude,
            String actorId
    ) {
        Instant now = Instant.now();
        ProblemaSocioambiental problema = new ProblemaSocioambiental();
        problema.setWorkspaceId(territorio.getWorkspaceId());
        problema.setTerritorioId(territorio.getId());
        problema.setObservacaoId(observacaoId);
        problema.setTitulo(TerritorioService.requireText(titulo, "titulo"));
        problema.setDescricao(descricao);
        problema.setCategoria(TerritorioService.defaultText(categoria, "Outro"));
        problema.setStatus("IDENTIFICADO");
        problema.setPrioridade(TerritorioService.defaultText(prioridade, "MEDIA"));
        problema.setSeveridade(severidade == null ? 3 : severidade);
        problema.setLatitude(latitude == null ? territorio.getLatitude() : latitude);
        problema.setLongitude(longitude == null ? territorio.getLongitude() : longitude);
        problema.setCreatedAt(now);
        problema.setUpdatedAt(now);
        problema = problemaRepository.save(problema);

        String problemaId = String.valueOf(problema.getId());
        memoryService.registrarObjeto(
                problema.getWorkspaceId(),
                "PROBLEMA",
                problemaId,
                null,
                problema.getTitulo(),
                problema.getStatus(),
                "api"
        );
        memoryService.registrarRelacaoAtiva(
                problema.getWorkspaceId(),
                "PROBLEMA",
                problemaId,
                "TERRITORIO",
                String.valueOf(territorio.getId()),
                "AFETA",
                "api",
                "Problema localizado no territorio"
        );
        if (observacaoId != null) {
            memoryService.registrarRelacaoAtiva(
                    problema.getWorkspaceId(),
                    "OBSERVACAO",
                    String.valueOf(observacaoId),
                    "PROBLEMA",
                    problemaId,
                    "IDENTIFICA",
                    "api",
                    "Observacao originou o problema"
            );
        }
        memoryService.registrarEvento(new MemoryEvent(
                problema.getWorkspaceId(),
                "PROBLEMA",
                problemaId,
                "PROBLEMA_IDENTIFICADO",
                "api",
                actorId,
                null,
                null,
                null,
                1,
                now,
                Map.of("titulo", problema.getTitulo(), "territorioId", territorio.getId())
        ));

        return problema;
    }

    @Transactional
    public ProblemaResponse priorizar(Long id, ProblemaRequest request) {
        ProblemaSocioambiental problema = requireProblema(id);
        Instant now = Instant.now();
        problema.setPrioridade(TerritorioService.defaultText(request.prioridade(), "ALTA"));
        problema.setStatus("PRIORIZADO");
        problema.setPriorizadoAt(now);
        problema.setUpdatedAt(now);
        problema = problemaRepository.save(problema);

        if (request.actorId() != null && !request.actorId().isBlank()) {
            memoryService.registrarObjeto(
                    problema.getWorkspaceId(),
                    "PESSOA",
                    request.actorId(),
                    null,
                    request.actorId(),
                    "ATIVA",
                    "api"
            );
            memoryService.registrarRelacaoAtiva(
                    problema.getWorkspaceId(),
                    "PROBLEMA",
                    String.valueOf(problema.getId()),
                    "PESSOA",
                    request.actorId(),
                    "PRIORIZADO_POR",
                    "api",
                    "Priorizacao registrada"
            );
        }
        memoryService.registrarEvento(new MemoryEvent(
                problema.getWorkspaceId(),
                "PROBLEMA",
                String.valueOf(problema.getId()),
                "PROBLEMA_PRIORIZADO",
                "api",
                request.actorId(),
                null,
                null,
                null,
                1,
                now,
                Map.of("prioridade", problema.getPrioridade())
        ));

        return toResponse(problema);
    }

    private ProblemaResponse toResponse(ProblemaSocioambiental problema) {
        return new ProblemaResponse(
                problema.getId(),
                problema.getWorkspaceId(),
                problema.getTerritorioId(),
                problema.getObservacaoId(),
                problema.getTitulo(),
                problema.getDescricao(),
                problema.getCategoria(),
                problema.getStatus(),
                problema.getPrioridade(),
                problema.getSeveridade(),
                problema.getLatitude(),
                problema.getLongitude(),
                problema.getUpdatedAt()
        );
>>>>>>> origin
    }
}
