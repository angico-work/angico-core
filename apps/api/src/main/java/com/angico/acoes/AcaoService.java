package com.angico.acoes;

<<<<<<< HEAD
import com.angico.common.ClockProvider;
import java.util.List;
=======
import java.time.Instant;
import java.util.List;
import java.util.Map;

import com.angico.core.memory.MemoryEvent;
import com.angico.core.memory.OperationalMemoryService;
import com.angico.impacto.Resultado;
import com.angico.impacto.ResultadoRepository;
import com.angico.missoes.Missao;
import com.angico.missoes.MissaoService;
import com.angico.territorios.TerritorioService;
>>>>>>> origin
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AcaoService {

    private static final String STATUS_INICIAL = "EM_ANDAMENTO";

    private final AcaoRepository acaoRepository;
<<<<<<< HEAD
    private final AtribuicaoRepository atribuicaoRepository;
    private final AcaoMemoryPublisher acaoMemoryPublisher;
    private final ClockProvider clock;

    public AcaoService(
            AcaoRepository acaoRepository,
            AtribuicaoRepository atribuicaoRepository,
            AcaoMemoryPublisher acaoMemoryPublisher,
            ClockProvider clock
    ) {
        this.acaoRepository = acaoRepository;
        this.atribuicaoRepository = atribuicaoRepository;
        this.acaoMemoryPublisher = acaoMemoryPublisher;
        this.clock = clock;
    }

    /**
     * Registra uma ação e a inscreve na memória operacional (objeto + evento +
     * relações com missão e responsável). Persistência e memória commitam
     * juntas na mesma transação.
     */
    @Transactional
    public AcaoResponse registrar(AcaoCreateRequest request) {
        Acao acao = new Acao(
                request.workspaceId(),
                request.titulo(),
                request.descricao(),
                STATUS_INICIAL,
                request.missaoId(),
                request.responsavelId(),
                clock.now()
        );

        Acao saved = acaoRepository.save(acao);
        acaoMemoryPublisher.publicarIniciada(saved);
        return AcaoResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<AcaoResponse> listar(String workspaceId) {
        return acaoRepository.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId)
                .stream()
                .map(AcaoResponse::from)
                .toList();
=======
    private final MissaoService missaoService;
    private final ResultadoRepository resultadoRepository;
    private final OperationalMemoryService memoryService;

    public AcaoService(
            AcaoRepository acaoRepository,
            MissaoService missaoService,
            ResultadoRepository resultadoRepository,
            OperationalMemoryService memoryService
    ) {
        this.acaoRepository = acaoRepository;
        this.missaoService = missaoService;
        this.resultadoRepository = resultadoRepository;
        this.memoryService = memoryService;
    }

    public List<AcaoResponse> list(String workspaceId) {
        return acaoRepository.findByWorkspaceIdOrderByUpdatedAtDesc(TerritorioService.workspace(workspaceId))
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public AcaoResponse create(AcaoRequest request) {
        Missao missao = missaoService.requireMissao(request.missaoId());
        Instant now = Instant.now();
        Acao acao = new Acao();
        acao.setWorkspaceId(missao.getWorkspaceId());
        acao.setTerritorioId(missao.getTerritorioId());
        acao.setMissaoId(missao.getId());
        acao.setTitulo(TerritorioService.requireText(request.titulo(), "titulo"));
        acao.setDescricao(request.descricao());
        acao.setStatus("PLANEJADA");
        acao.setResponsavelId(request.responsavelId());
        acao.setResultadoDescricao(request.resultadoDescricao());
        acao.setLatitude(request.latitude() == null ? missao.getLatitude() : request.latitude());
        acao.setLongitude(request.longitude() == null ? missao.getLongitude() : request.longitude());
        acao.setCreatedAt(now);
        acao.setUpdatedAt(now);
        acao = acaoRepository.save(acao);

        registrarCriacao(acao, request.actorId(), now);
        return toResponse(acao);
    }

    @Transactional
    public AcaoResponse concluir(Long id, AcaoRequest request) {
        Acao acao = acaoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Acao nao encontrada: " + id));
        Instant now = Instant.now();
        acao.setStatus("CONCLUIDA");
        acao.setResultadoDescricao(TerritorioService.defaultText(request.resultadoDescricao(), acao.getResultadoDescricao()));
        acao.setConcluidaAt(now);
        acao.setUpdatedAt(now);
        acao = acaoRepository.save(acao);

        Resultado resultado = new Resultado();
        resultado.setWorkspaceId(acao.getWorkspaceId());
        resultado.setAcaoId(acao.getId());
        resultado.setTitulo("Resultado de " + acao.getTitulo());
        resultado.setDescricao(acao.getResultadoDescricao());
        resultado.setStatus("REGISTRADO");
        resultado.setCreatedAt(now);
        resultado = resultadoRepository.save(resultado);

        memoryService.registrarObjeto(
                acao.getWorkspaceId(),
                "RESULTADO",
                String.valueOf(resultado.getId()),
                null,
                resultado.getTitulo(),
                resultado.getStatus(),
                "api"
        );
        memoryService.registrarRelacaoAtiva(
                acao.getWorkspaceId(),
                "ACAO",
                String.valueOf(acao.getId()),
                "RESULTADO",
                String.valueOf(resultado.getId()),
                "PRODUZ",
                "api",
                "Resultado gerado pela conclusao da acao"
        );
        memoryService.registrarObjeto(
                acao.getWorkspaceId(),
                "ACAO",
                String.valueOf(acao.getId()),
                null,
                acao.getTitulo(),
                acao.getStatus(),
                "api"
        );
        memoryService.registrarEvento(new MemoryEvent(
                acao.getWorkspaceId(),
                "ACAO",
                String.valueOf(acao.getId()),
                "ACAO_CONCLUIDA",
                "api",
                request.actorId(),
                null,
                null,
                null,
                1,
                now,
                Map.of("resultadoId", resultado.getId())
        ));
        return toResponse(acao);
    }

    private void registrarCriacao(Acao acao, String actorId, Instant occurredAt) {
        memoryService.registrarObjeto(
                acao.getWorkspaceId(),
                "ACAO",
                String.valueOf(acao.getId()),
                null,
                acao.getTitulo(),
                acao.getStatus(),
                "api"
        );
        memoryService.registrarRelacaoAtiva(
                acao.getWorkspaceId(),
                "MISSAO",
                String.valueOf(acao.getMissaoId()),
                "ACAO",
                String.valueOf(acao.getId()),
                "COMPOSTA_POR",
                "api",
                "Acao criada dentro da missao"
        );
        if (acao.getResponsavelId() != null && !acao.getResponsavelId().isBlank()) {
            memoryService.registrarObjeto(
                    acao.getWorkspaceId(),
                    "PESSOA",
                    acao.getResponsavelId(),
                    null,
                    acao.getResponsavelId(),
                    "ATIVA",
                    "api"
            );
            memoryService.registrarRelacaoAtiva(
                    acao.getWorkspaceId(),
                    "PESSOA",
                    acao.getResponsavelId(),
                    "ACAO",
                    String.valueOf(acao.getId()),
                    "RESPONSAVEL_POR",
                    "api",
                    "Responsavel informado na criacao da acao"
            );
        }
        memoryService.registrarEvento(new MemoryEvent(
                acao.getWorkspaceId(),
                "ACAO",
                String.valueOf(acao.getId()),
                "ACAO_CRIADA",
                "api",
                actorId,
                null,
                null,
                null,
                1,
                occurredAt,
                Map.of("titulo", acao.getTitulo(), "missaoId", acao.getMissaoId())
        ));
    }

    private AcaoResponse toResponse(Acao acao) {
        return new AcaoResponse(
                acao.getId(),
                acao.getWorkspaceId(),
                acao.getTerritorioId(),
                acao.getMissaoId(),
                acao.getTitulo(),
                acao.getDescricao(),
                acao.getStatus(),
                acao.getResponsavelId(),
                acao.getResultadoDescricao(),
                acao.getLatitude(),
                acao.getLongitude(),
                acao.getUpdatedAt()
        );
>>>>>>> origin
    }
}
