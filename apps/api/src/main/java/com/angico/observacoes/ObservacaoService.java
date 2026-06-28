package com.angico.observacoes;

<<<<<<< HEAD
import com.angico.common.ClockProvider;
import java.util.List;
=======
import java.time.Instant;
import java.util.List;
import java.util.Map;

import com.angico.core.memory.MemoryEvent;
import com.angico.core.memory.OperationalMemoryService;
import com.angico.potencialidades.PotencialidadeService;
import com.angico.problemas.ProblemaService;
import com.angico.territorios.Territorio;
import com.angico.territorios.TerritorioService;
>>>>>>> origin
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ObservacaoService {

    private static final String STATUS_INICIAL = "ABERTA";
    private static final String URGENCIA_PADRAO = "MEDIA";

    private final ObservacaoRepository observacaoRepository;
<<<<<<< HEAD
    private final ObservacaoMemoryPublisher observacaoMemoryPublisher;
    private final ClockProvider clock;

    public ObservacaoService(
            ObservacaoRepository observacaoRepository,
            ObservacaoMemoryPublisher observacaoMemoryPublisher,
            ClockProvider clock
    ) {
        this.observacaoRepository = observacaoRepository;
        this.observacaoMemoryPublisher = observacaoMemoryPublisher;
        this.clock = clock;
    }

    /**
     * Registra uma observação e a inscreve na memória do território (objeto +
     * evento + relação com o território). Persistência e memória commitam
     * juntas na mesma transação.
     */
    @Transactional
    public ObservacaoResponse registrar(ObservacaoCreateRequest request) {
        ObservacaoTerritorial observacao = new ObservacaoTerritorial(
                request.workspaceId(),
                request.territorioId(),
                request.categoria(),
                request.titulo(),
                request.descricao(),
                request.localizacao(),
                request.latitude(),
                request.longitude(),
                request.urgencia() == null || request.urgencia().isBlank()
                        ? URGENCIA_PADRAO : request.urgencia(),
                STATUS_INICIAL,
                request.autorId(),
                clock.now()
        );

        ObservacaoTerritorial saved = observacaoRepository.save(observacao);
        observacaoMemoryPublisher.publicarRegistrada(saved);
        return ObservacaoResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<ObservacaoResponse> listar(String workspaceId) {
        return observacaoRepository.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId)
                .stream()
                .map(ObservacaoResponse::from)
                .toList();
=======
    private final TerritorioService territorioService;
    private final ProblemaService problemaService;
    private final PotencialidadeService potencialidadeService;
    private final OperationalMemoryService memoryService;

    public ObservacaoService(
            ObservacaoRepository observacaoRepository,
            TerritorioService territorioService,
            ProblemaService problemaService,
            PotencialidadeService potencialidadeService,
            OperationalMemoryService memoryService
    ) {
        this.observacaoRepository = observacaoRepository;
        this.territorioService = territorioService;
        this.problemaService = problemaService;
        this.potencialidadeService = potencialidadeService;
        this.memoryService = memoryService;
    }

    public List<ObservacaoResponse> list(String workspaceId) {
        return observacaoRepository.findByWorkspaceIdOrderByCreatedAtDesc(TerritorioService.workspace(workspaceId))
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public ObservacaoResponse get(Long id) {
        return toResponse(requireObservacao(id));
    }

    public ObservacaoTerritorial requireObservacao(Long id) {
        return observacaoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Observacao nao encontrada: " + id));
    }

    @Transactional
    public ObservacaoResponse create(ObservacaoCreateRequest request) {
        Territorio territorio = territorioService.requireTerritorio(request.territorioId());
        Instant now = Instant.now();

        ObservacaoTerritorial observacao = new ObservacaoTerritorial();
        observacao.setWorkspaceId(territorio.getWorkspaceId());
        observacao.setTerritorioId(territorio.getId());
        observacao.setTitulo(TerritorioService.requireText(request.titulo(), "titulo"));
        observacao.setDescricao(request.descricao());
        observacao.setCategoria(TerritorioService.defaultText(request.categoria(), "Outro"));
        observacao.setTipo(TerritorioService.defaultText(request.tipo(), "PROBLEMA").toUpperCase());
        observacao.setStatus(TerritorioService.defaultText(request.status(), "SUBMETIDA").toUpperCase());
        observacao.setSeveridade(request.severidade() == null ? 3 : request.severidade());
        observacao.setEvidenciaInicial(request.evidenciaInicial());
        observacao.setLocalDescricao(request.localDescricao());
        observacao.setCidade(request.cidade());
        observacao.setBairro(request.bairro());
        observacao.setLatitude(request.latitude() == null ? territorio.getLatitude() : request.latitude());
        observacao.setLongitude(request.longitude() == null ? territorio.getLongitude() : request.longitude());
        observacao.setActorId(request.actorId());
        observacao.setCreatedAt(now);
        observacao.setUpdatedAt(now);
        observacao = observacaoRepository.save(observacao);

        registrarMemoriaCriacao(observacao, territorio, now);

        if ("PROBLEMA".equals(observacao.getTipo())) {
            var problema = problemaService.createForObservation(
                    territorio,
                    observacao.getId(),
                    observacao.getTitulo(),
                    observacao.getDescricao(),
                    observacao.getCategoria(),
                    "MEDIA",
                    observacao.getSeveridade(),
                    observacao.getLatitude(),
                    observacao.getLongitude(),
                    observacao.getActorId()
            );
            observacao.setProblemaId(problema.getId());
        } else if ("POTENCIALIDADE".equals(observacao.getTipo())) {
            var potencialidade = potencialidadeService.createForObservation(
                    territorio,
                    observacao.getId(),
                    observacao.getTitulo(),
                    observacao.getDescricao(),
                    observacao.getCategoria(),
                    2,
                    observacao.getLatitude(),
                    observacao.getLongitude(),
                    observacao.getActorId()
            );
            observacao.setPotencialidadeId(potencialidade.getId());
        }

        observacao.setUpdatedAt(Instant.now());
        return toResponse(observacaoRepository.save(observacao));
    }

    @Transactional
    public ObservacaoResponse validar(Long id, ObservacaoUpdateRequest request) {
        ObservacaoTerritorial observacao = requireObservacao(id);
        Instant now = Instant.now();
        observacao.setStatus("VALIDADA");
        observacao.setValidadaAt(now);
        observacao.setUpdatedAt(now);
        observacao = observacaoRepository.save(observacao);
        memoryService.registrarObjeto(
                observacao.getWorkspaceId(),
                "OBSERVACAO",
                String.valueOf(observacao.getId()),
                null,
                observacao.getTitulo(),
                observacao.getStatus(),
                "api"
        );
        memoryService.registrarEvento(new MemoryEvent(
                observacao.getWorkspaceId(),
                "OBSERVACAO",
                String.valueOf(observacao.getId()),
                "OBSERVACAO_VALIDADA",
                "api",
                request.actorId(),
                null,
                null,
                null,
                1,
                now,
                Map.of("status", observacao.getStatus())
        ));
        return toResponse(observacao);
    }

    @Transactional
    public ObservacaoResponse rejeitar(Long id, ObservacaoUpdateRequest request) {
        ObservacaoTerritorial observacao = requireObservacao(id);
        Instant now = Instant.now();
        observacao.setStatus("REJEITADA");
        observacao.setRejeitadaAt(now);
        observacao.setUpdatedAt(now);
        observacao = observacaoRepository.save(observacao);
        memoryService.registrarObjeto(
                observacao.getWorkspaceId(),
                "OBSERVACAO",
                String.valueOf(observacao.getId()),
                null,
                observacao.getTitulo(),
                observacao.getStatus(),
                "api"
        );
        memoryService.registrarEvento(new MemoryEvent(
                observacao.getWorkspaceId(),
                "OBSERVACAO",
                String.valueOf(observacao.getId()),
                "OBSERVACAO_REJEITADA",
                "api",
                request.actorId(),
                null,
                null,
                null,
                1,
                now,
                Map.of("status", observacao.getStatus())
        ));
        return toResponse(observacao);
    }

    private void registrarMemoriaCriacao(
            ObservacaoTerritorial observacao,
            Territorio territorio,
            Instant occurredAt
    ) {
        String observacaoId = String.valueOf(observacao.getId());
        memoryService.registrarObjeto(
                observacao.getWorkspaceId(),
                "OBSERVACAO",
                observacaoId,
                null,
                observacao.getTitulo(),
                observacao.getStatus(),
                "api"
        );
        memoryService.registrarRelacaoAtiva(
                observacao.getWorkspaceId(),
                "OBSERVACAO",
                observacaoId,
                "TERRITORIO",
                String.valueOf(territorio.getId()),
                "OCORRE_EM",
                "api",
                "Observacao georreferenciada"
        );
        if (observacao.getActorId() != null && !observacao.getActorId().isBlank()) {
            memoryService.registrarObjeto(
                    observacao.getWorkspaceId(),
                    "PESSOA",
                    observacao.getActorId(),
                    null,
                    observacao.getActorId(),
                    "ATIVA",
                    "api"
            );
            memoryService.registrarRelacaoAtiva(
                    observacao.getWorkspaceId(),
                    "OBSERVACAO",
                    observacaoId,
                    "PESSOA",
                    observacao.getActorId(),
                    "REGISTRADA_POR",
                    "api",
                    "Autor informado na criacao"
            );
        }
        if (observacao.getEvidenciaInicial() != null && !observacao.getEvidenciaInicial().isBlank()) {
            String evidenciaId = "observacao-" + observacaoId + "-texto";
            memoryService.registrarObjeto(
                    observacao.getWorkspaceId(),
                    "EVIDENCIA",
                    evidenciaId,
                    null,
                    "Evidencia textual inicial",
                    "ANEXADA",
                    "api"
            );
            memoryService.registrarRelacaoAtiva(
                    observacao.getWorkspaceId(),
                    "OBSERVACAO",
                    observacaoId,
                    "EVIDENCIA",
                    evidenciaId,
                    "COMPROVADA_POR",
                    "api",
                    "Evidencia textual enviada com a observacao"
            );
            memoryService.registrarEvento(new MemoryEvent(
                    observacao.getWorkspaceId(),
                    "EVIDENCIA",
                    evidenciaId,
                    "EVIDENCIA_ANEXADA",
                    "api",
                    observacao.getActorId(),
                    null,
                    null,
                    null,
                    1,
                    occurredAt,
                    Map.of("observacaoId", observacao.getId())
            ));
        }
        memoryService.registrarEvento(new MemoryEvent(
                observacao.getWorkspaceId(),
                "OBSERVACAO",
                observacaoId,
                "OBSERVACAO_CRIADA",
                "api",
                observacao.getActorId(),
                null,
                null,
                null,
                1,
                occurredAt,
                Map.of(
                        "titulo", observacao.getTitulo(),
                        "territorioId", territorio.getId(),
                        "latitude", observacao.getLatitude(),
                        "longitude", observacao.getLongitude()
                )
        ));
    }

    private ObservacaoResponse toResponse(ObservacaoTerritorial observacao) {
        return new ObservacaoResponse(
                observacao.getId(),
                observacao.getWorkspaceId(),
                observacao.getTerritorioId(),
                observacao.getTitulo(),
                observacao.getDescricao(),
                observacao.getCategoria(),
                observacao.getTipo(),
                observacao.getStatus(),
                observacao.getSeveridade(),
                observacao.getEvidenciaInicial(),
                observacao.getLocalDescricao(),
                observacao.getCidade(),
                observacao.getBairro(),
                observacao.getLatitude(),
                observacao.getLongitude(),
                observacao.getActorId(),
                observacao.getProblemaId(),
                observacao.getPotencialidadeId(),
                observacao.getCreatedAt(),
                observacao.getUpdatedAt()
        );
>>>>>>> origin
    }
}
