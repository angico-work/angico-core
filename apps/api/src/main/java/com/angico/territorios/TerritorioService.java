package com.angico.territorios;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import com.angico.acoes.AcaoRepository;
import com.angico.common.CurrentActorProvider;
import com.angico.common.ForbiddenException;
import com.angico.core.memory.MemoryEvent;
import com.angico.core.memory.MemoryQueryService;
import com.angico.core.memory.OperationalMemoryService;
import com.angico.impacto.IndicadorRepository;
import com.angico.impacto.MedicaoRepository;
import com.angico.mensagens.MensagemRepository;
import com.angico.missoes.MissaoRepository;
import com.angico.observacoes.ObservacaoRepository;
import com.angico.potencialidades.PotencialidadeRepository;
import com.angico.problemas.ProblemaRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TerritorioService {

    public static final String DEFAULT_WORKSPACE_ID = "angico-publico";

    private final TerritorioRepository territorioRepository;
    private final ObservacaoRepository observacaoRepository;
    private final ProblemaRepository problemaRepository;
    private final PotencialidadeRepository potencialidadeRepository;
    private final MissaoRepository missaoRepository;
    private final AcaoRepository acaoRepository;
    private final IndicadorRepository indicadorRepository;
    private final MedicaoRepository medicaoRepository;
    private final MensagemRepository mensagemRepository;
    private final OperationalMemoryService memoryService;
    private final MemoryQueryService memoryQueryService;
    private final CurrentActorProvider currentActorProvider;
    private final ObjectMapper objectMapper;

    public TerritorioService(
            TerritorioRepository territorioRepository,
            ObservacaoRepository observacaoRepository,
            ProblemaRepository problemaRepository,
            PotencialidadeRepository potencialidadeRepository,
            MissaoRepository missaoRepository,
            AcaoRepository acaoRepository,
            IndicadorRepository indicadorRepository,
            MedicaoRepository medicaoRepository,
            MensagemRepository mensagemRepository,
            OperationalMemoryService memoryService,
            MemoryQueryService memoryQueryService,
            CurrentActorProvider currentActorProvider,
            ObjectMapper objectMapper
    ) {
        this.territorioRepository = territorioRepository;
        this.observacaoRepository = observacaoRepository;
        this.problemaRepository = problemaRepository;
        this.potencialidadeRepository = potencialidadeRepository;
        this.missaoRepository = missaoRepository;
        this.acaoRepository = acaoRepository;
        this.indicadorRepository = indicadorRepository;
        this.medicaoRepository = medicaoRepository;
        this.mensagemRepository = mensagemRepository;
        this.memoryService = memoryService;
        this.memoryQueryService = memoryQueryService;
        this.currentActorProvider = currentActorProvider;
        this.objectMapper = objectMapper;
    }

    public List<TerritorioResponse> list(String workspaceId) {
        String selectedWorkspace = workspace(workspaceId);
        ensureWorkspaceAccess(selectedWorkspace);
        return territorioRepository.findByWorkspaceIdOrderByNomeAsc(selectedWorkspace)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public TerritorioResponse get(Long id) {
        Territorio territorio = requireTerritorio(id);
        ensureWorkspaceAccess(territorio.getWorkspaceId());
        return toResponse(territorio);
    }

    public Territorio requireTerritorio(Long id) {
        return territorioRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Territorio nao encontrado: " + id));
    }

    public Territorio defaultTerritory() {
        return territorioRepository.findFirstByWorkspaceIdOrderByIdAsc(DEFAULT_WORKSPACE_ID)
                .orElseGet(() -> territorioRepository.findAll().stream().findFirst()
                        .orElseThrow(() -> new IllegalStateException("Nenhum territorio cadastrado.")));
    }

    @Transactional
    public TerritorioResponse create(TerritorioCreateRequest request) {
        Instant now = Instant.now();
        Territorio territorio = new Territorio();
        territorio.setWorkspaceId(workspace(request.workspaceId()));
        ensureWorkspaceAccess(territorio.getWorkspaceId());
        territorio.setNome(requireText(request.nome(), "nome"));
        territorio.setTipo(defaultText(request.tipo(), "BAIRRO"));
        territorio.setCidade(request.cidade());
        territorio.setBairro(request.bairro());
        territorio.setEstado(request.estado());
        territorio.setPais(defaultText(request.pais(), "Brasil"));
        territorio.setLatitude(defaultNumber(request.latitude(), -23.5614));
        territorio.setLongitude(defaultNumber(request.longitude(), -46.6559));
        territorio.setBoundingBox(toJson(request.boundingBox()));
        territorio.setStatus("ATIVO");
        territorio.setCreatedAt(now);
        territorio.setUpdatedAt(now);
        territorio = territorioRepository.save(territorio);

        String entityId = String.valueOf(territorio.getId());
        memoryService.registrarObjeto(
                territorio.getWorkspaceId(),
                "TERRITORIO",
                entityId,
                null,
                territorio.getNome(),
                territorio.getStatus(),
                "api"
        );
        memoryService.registrarEvento(new MemoryEvent(
                territorio.getWorkspaceId(),
                "TERRITORIO",
                entityId,
                "TERRITORIO_CRIADO",
                "api",
                null,
                null,
                null,
                null,
                1,
                now,
                Map.of("nome", territorio.getNome(), "cidade", safe(territorio.getCidade()))
        ));

        return toResponse(territorio);
    }

    public Map<String, Object> dashboard(Long territorioId) {
        Territorio territorio = requireTerritorio(territorioId);
        String workspaceId = territorio.getWorkspaceId();
        ensureWorkspaceAccess(workspaceId);

        var observacoes = observacaoRepository.findByTerritorioIdOrderByCreatedAtDesc(territorioId);
        var problemas = problemaRepository.findByTerritorioIdOrderByUpdatedAtDesc(territorioId);
        var potencialidades = potencialidadeRepository.findByTerritorioIdOrderByUpdatedAtDesc(territorioId);
        var missoes = missaoRepository.findByTerritorioIdOrderByUpdatedAtDesc(territorioId);
        var acoes = acaoRepository.findByTerritorioIdOrderByUpdatedAtDesc(territorioId);
        var indicadores = indicadorRepository.findByTerritorioIdOrderByNomeAsc(territorioId);
        var mensagensRecentes = mensagemRepository.findTop8ByWorkspaceIdOrderByCreatedAtDesc(workspaceId);
        var timeline = memoryQueryService.timelineForTerritory(workspaceId, String.valueOf(territorioId));
        Map<String, Object> graph = Map.of("nodes", List.of(), "relations", List.of());

        List<Map<String, Object>> markers = new java.util.ArrayList<>();
        observacoes.forEach(item -> markers.add(Map.of(
                "id", item.getId(),
                "type", "OBSERVACAO",
                "title", item.getTitulo(),
                "status", item.getStatus(),
                "priority", item.getSeveridade() == null ? "NA" : item.getSeveridade(),
                "latitude", item.getLatitude(),
                "longitude", item.getLongitude(),
                "updatedAt", item.getUpdatedAt()
        )));
        problemas.forEach(item -> markers.add(Map.of(
                "id", item.getId(),
                "type", "PROBLEMA",
                "title", item.getTitulo(),
                "status", item.getStatus(),
                "priority", item.getPrioridade(),
                "latitude", item.getLatitude(),
                "longitude", item.getLongitude(),
                "updatedAt", item.getUpdatedAt()
        )));
        potencialidades.forEach(item -> markers.add(Map.of(
                "id", item.getId(),
                "type", "POTENCIALIDADE",
                "title", item.getTitulo(),
                "status", item.getStatus(),
                "priority", item.getPrioridade() == null ? "NA" : item.getPrioridade(),
                "latitude", item.getLatitude(),
                "longitude", item.getLongitude(),
                "updatedAt", item.getUpdatedAt()
        )));
        missoes.forEach(item -> markers.add(Map.of(
                "id", item.getId(),
                "type", "MISSAO",
                "title", item.getTitulo(),
                "status", item.getStatus(),
                "priority", item.getPrioridade(),
                "latitude", item.getLatitude(),
                "longitude", item.getLongitude(),
                "updatedAt", item.getUpdatedAt()
        )));
        acoes.stream()
                .filter(item -> item.getLatitude() != null && item.getLongitude() != null)
                .forEach(item -> markers.add(Map.of(
                        "id", item.getId(),
                        "type", "ACAO",
                        "title", item.getTitulo(),
                        "status", item.getStatus(),
                        "priority", "NA",
                        "latitude", item.getLatitude(),
                        "longitude", item.getLongitude(),
                        "updatedAt", item.getUpdatedAt()
                )));

        Map<String, Object> dashboard = new java.util.LinkedHashMap<>();
        dashboard.put("workspaceId", workspaceId);
        dashboard.put("territory", toResponse(territorio));
        dashboard.put("territories", list(workspaceId));
        dashboard.put("stats", List.of(
                        Map.of("label", "Observacoes", "value", observacoes.size()),
                        Map.of("label", "Problemas ativos", "value", problemas.stream().filter(p -> !"RESOLVIDO".equals(p.getStatus())).count()),
                        Map.of("label", "Potencialidades", "value", potencialidades.size()),
                        Map.of("label", "Missoes em andamento", "value", missoes.stream().filter(m -> "EM_ANDAMENTO".equals(m.getStatus())).count()),
                        Map.of("label", "Acoes concluidas", "value", acoes.stream().filter(a -> "CONCLUIDA".equals(a.getStatus())).count()),
                        Map.of("label", "Medicoes", "value", medicaoRepository.countByWorkspaceId(workspaceId)),
                        Map.of("label", "Mensagens", "value", mensagemRepository.countByWorkspaceId(workspaceId))
                ));
        dashboard.put("markers", markers);
        dashboard.put("observacoes", observacoes);
        dashboard.put("problemas", problemas);
        dashboard.put("potencialidades", potencialidades);
        dashboard.put("missoes", missoes);
        dashboard.put("acoes", acoes);
        dashboard.put("indicadores", indicadores);
        dashboard.put("mensagensRecentes", mensagensRecentes.stream()
                .map(mensagem -> Map.of(
                        "id", mensagem.getId(),
                        "conversaId", mensagem.getConversaId(),
                        "senderNome", mensagem.getSenderNome(),
                        "corpo", mensagem.getCorpo(),
                        "hasLocation", mensagem.getLatitude() != null && mensagem.getLongitude() != null,
                        "createdAt", mensagem.getCreatedAt()
                ))
                .toList());
        dashboard.put("timeline", timeline);
        dashboard.put("graph", graph);
        dashboard.put("categoryDistribution", problemas.stream()
                        .collect(java.util.stream.Collectors.groupingBy(
                                item -> defaultText(item.getCategoria(), "Outro"),
                                java.util.stream.Collectors.counting()
                        ))
                        .entrySet()
                        .stream()
                        .map(entry -> Map.of("name", entry.getKey(), "value", entry.getValue()))
                        .toList());
        dashboard.put("impact", indicadores.stream()
                        .map(indicador -> Map.of(
                                "value", medicaoRepository.findByIndicadorIdOrderByCreatedAtDesc(indicador.getId()).stream()
                                        .findFirst()
                                        .map(medicao -> medicao.getValor() + " " + defaultText(medicao.getUnidade(), indicador.getUnidade()))
                                        .orElse("Sem medicao"),
                                "label", indicador.getNome(),
                                "period", "ultimo registro"
                        ))
                        .toList());
        return dashboard;
    }

    public List<Map<String, Object>> timeline(Long territorioId) {
        Territorio territorio = requireTerritorio(territorioId);
        ensureWorkspaceAccess(territorio.getWorkspaceId());
        return memoryQueryService.timelineForTerritory(
                territorio.getWorkspaceId(),
                String.valueOf(territorio.getId())
        );
    }

    public Map<String, Object> graph(Long territorioId) {
        Territorio territorio = requireTerritorio(territorioId);
        ensureWorkspaceAccess(territorio.getWorkspaceId());
        if (!canViewOntologyDetails()) {
            throw new ForbiddenException("Detalhes ontologicos protegidos.");
        }
        return memoryQueryService.graphForTerritory(
                territorio.getWorkspaceId(),
                String.valueOf(territorio.getId())
        );
    }

    private void ensureWorkspaceAccess(String workspaceId) {
        currentActorProvider.currentWorkspaceId().ifPresent(actorWorkspace -> {
            if (!actorWorkspace.equals(workspaceId)) {
                throw new ForbiddenException("Acesso negado ao workspace informado.");
            }
        });
    }

    private boolean canViewOntologyDetails() {
        return currentActorProvider.currentPapel()
                .map(role -> role.equalsIgnoreCase("COORDENACAO") || role.equalsIgnoreCase("ADMIN"))
                .orElse(false);
    }

    private TerritorioResponse toResponse(Territorio territorio) {
        return new TerritorioResponse(
                territorio.getId(),
                territorio.getWorkspaceId(),
                territorio.getNome(),
                territorio.getTipo(),
                territorio.getCidade(),
                territorio.getBairro(),
                territorio.getEstado(),
                territorio.getPais(),
                territorio.getLatitude(),
                territorio.getLongitude(),
                fromJson(territorio.getBoundingBox()),
                territorio.getStatus(),
                territorio.getUpdatedAt()
        );
    }

    public static String workspace(String value) {
        return value == null || value.isBlank() ? DEFAULT_WORKSPACE_ID : value.trim();
    }

    public static String defaultText(String value, String defaultValue) {
        return value == null || value.isBlank() ? defaultValue : value.trim();
    }

    public static String requireText(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(fieldName + " e obrigatorio.");
        }
        return value.trim();
    }

    public static String safe(String value) {
        return value == null ? "" : value;
    }

    private Double defaultNumber(Double value, Double defaultValue) {
        return value == null ? defaultValue : value;
    }

    private String toJson(List<Double> values) {
        if (values == null || values.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(values);
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("boundingBox invalido.", ex);
        }
    }

    private List<Double> fromJson(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(value, new TypeReference<>() {
            });
        } catch (Exception ex) {
            return List.of();
        }
    }
}
