package com.angico.missoes;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import com.angico.core.memory.MemoryEvent;
import com.angico.core.memory.OperationalMemoryService;
import com.angico.problemas.ProblemaService;
import com.angico.territorios.Territorio;
import com.angico.territorios.TerritorioService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MissaoService {

    private final MissaoRepository missaoRepository;
    private final TerritorioService territorioService;
    private final ProblemaService problemaService;
    private final OperationalMemoryService memoryService;

    public MissaoService(
            MissaoRepository missaoRepository,
            TerritorioService territorioService,
            ProblemaService problemaService,
            OperationalMemoryService memoryService
    ) {
        this.missaoRepository = missaoRepository;
        this.territorioService = territorioService;
        this.problemaService = problemaService;
        this.memoryService = memoryService;
    }

    public List<MissaoResponse> list(String workspaceId) {
        return missaoRepository.findByWorkspaceIdOrderByUpdatedAtDesc(TerritorioService.workspace(workspaceId))
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public MissaoResponse get(Long id) {
        return toResponse(requireMissao(id));
    }

    public Missao requireMissao(Long id) {
        return missaoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Missão não encontrada: " + id));
    }

    @Transactional
    public MissaoResponse create(MissaoRequest request) {
        Territorio territorio = territorioService.requireTerritorio(request.territorioId());
        if (request.problemaId() != null) {
            problemaService.requireProblema(request.problemaId());
        }

        Instant now = Instant.now();
        Missao missao = new Missao();
        missao.setWorkspaceId(territorio.getWorkspaceId());
        missao.setTerritorioId(territorio.getId());
        missao.setProblemaId(request.problemaId());
        missao.setTitulo(TerritorioService.requireText(request.titulo(), "titulo"));
        missao.setDescricao(request.descricao());
        missao.setStatus("PLANEJADA");
        missao.setPrioridade(TerritorioService.defaultText(request.prioridade(), "MEDIA"));
        missao.setProgresso(0);
        missao.setLatitude(request.latitude() == null ? territorio.getLatitude() : request.latitude());
        missao.setLongitude(request.longitude() == null ? territorio.getLongitude() : request.longitude());
        missao.setOrganizacaoId(request.organizacaoId());
        missao.setCreatedAt(now);
        missao.setUpdatedAt(now);
        missao = missaoRepository.save(missao);

        registrarMemoriaCriacao(missao, request.actorId(), now);
        return toResponse(missao);
    }

    @Transactional
    public MissaoResponse iniciar(Long id, MissaoRequest request) {
        Missao missao = requireMissao(id);
        Instant now = Instant.now();
        missao.setStatus("EM_ANDAMENTO");
        missao.setProgresso(Math.max(missao.getProgresso() == null ? 0 : missao.getProgresso(), 10));
        missao.setIniciadaAt(now);
        missao.setUpdatedAt(now);
        missao = missaoRepository.save(missao);
        registrarEvento(missao, "MISSAO_INICIADA", request.actorId(), now, Map.of("status", missao.getStatus()));
        return toResponse(missao);
    }

    @Transactional
    public MissaoResponse concluir(Long id, MissaoRequest request) {
        Missao missao = requireMissao(id);
        Instant now = Instant.now();
        missao.setStatus("CONCLUIDA");
        missao.setProgresso(100);
        missao.setConcluidaAt(now);
        missao.setUpdatedAt(now);
        missao = missaoRepository.save(missao);
        registrarEvento(missao, "MISSAO_CONCLUIDA", request.actorId(), now, Map.of("status", missao.getStatus()));
        return toResponse(missao);
    }

    private void registrarMemoriaCriacao(Missao missao, String actorId, Instant occurredAt) {
        String missaoId = String.valueOf(missao.getId());
        memoryService.registrarObjeto(
                missao.getWorkspaceId(),
                "MISSAO",
                missaoId,
                null,
                missao.getTitulo(),
                missao.getStatus(),
                "api"
        );
        memoryService.registrarRelacaoAtiva(
                missao.getWorkspaceId(),
                "MISSAO",
                missaoId,
                "TERRITORIO",
                String.valueOf(missao.getTerritorioId()),
                "ATUA_EM",
                "api",
                "Missão territorial"
        );
        if (missao.getProblemaId() != null) {
            memoryService.registrarRelacaoAtiva(
                    missao.getWorkspaceId(),
                    "MISSAO",
                    missaoId,
                    "PROBLEMA",
                    String.valueOf(missao.getProblemaId()),
                    "ENFRENTA",
                    "api",
                    "Missão vinculada ao problema"
            );
        }
        if (missao.getOrganizacaoId() != null && !missao.getOrganizacaoId().isBlank()) {
            memoryService.registrarObjeto(
                    missao.getWorkspaceId(),
                    "ORGANIZACAO",
                    missao.getOrganizacaoId(),
                    null,
                    missao.getOrganizacaoId(),
                    "ATIVA",
                    "api"
            );
            memoryService.registrarRelacaoAtiva(
                    missao.getWorkspaceId(),
                    "MISSAO",
                    missaoId,
                    "ORGANIZACAO",
                    missao.getOrganizacaoId(),
                    "MOBILIZA",
                    "api",
                    "Organização mobilizada pela missão"
            );
        }
        registrarEvento(missao, "MISSAO_CRIADA", actorId, occurredAt, Map.of(
                "titulo", missao.getTitulo(),
                "territorioId", missao.getTerritorioId()
        ));
    }

    private void registrarEvento(
            Missao missao,
            String eventType,
            String actorId,
            Instant occurredAt,
            Map<String, Object> payload
    ) {
        memoryService.registrarObjeto(
                missao.getWorkspaceId(),
                "MISSAO",
                String.valueOf(missao.getId()),
                null,
                missao.getTitulo(),
                missao.getStatus(),
                "api"
        );
        memoryService.registrarEvento(new MemoryEvent(
                missao.getWorkspaceId(),
                "MISSAO",
                String.valueOf(missao.getId()),
                eventType,
                "api",
                actorId,
                null,
                null,
                null,
                1,
                occurredAt,
                payload
        ));
    }

    private MissaoResponse toResponse(Missao missao) {
        return new MissaoResponse(
                missao.getId(),
                missao.getWorkspaceId(),
                missao.getTerritorioId(),
                missao.getProblemaId(),
                missao.getTitulo(),
                missao.getDescricao(),
                missao.getStatus(),
                missao.getPrioridade(),
                missao.getProgresso(),
                missao.getLatitude(),
                missao.getLongitude(),
                missao.getOrganizacaoId(),
                missao.getUpdatedAt()
        );
    }
}
