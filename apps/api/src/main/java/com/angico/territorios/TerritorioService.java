package com.angico.territorios;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import com.angico.acoes.AcaoRepository;
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
import com.angico.workspaces.WorkspaceAuthorizationService;
import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
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
    private final WorkspaceAuthorizationService authorizationService;
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
            WorkspaceAuthorizationService authorizationService,
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
        this.authorizationService = authorizationService;
        this.objectMapper = objectMapper;
    }

    public List<TerritorioResponse> list(String workspaceId) {
        String selectedWorkspace = authorizationService.requireAuthorizedWorkspace(workspaceId);
        return territorioRepository.findByWorkspaceIdOrderByNomeAsc(selectedWorkspace)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public TerritorioResponse get(Long id) {
        Territorio territorio = requireTerritorio(id);
        return toResponse(territorio);
    }

    public Territorio requireTerritorio(Long id) {
        Territorio territorio = territorioRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Territorio nao encontrado: " + id));
        authorizationService.requireMember(territorio.getWorkspaceId());
        return territorio;
    }

    public Territorio defaultTerritory() {
        Territorio territorio = territorioRepository.findFirstByWorkspaceIdOrderByIdAsc(DEFAULT_WORKSPACE_ID)
                .orElseGet(() -> territorioRepository.findAll().stream().findFirst()
                        .orElseThrow(() -> new IllegalStateException("Nenhum territorio cadastrado.")));
        authorizationService.requireMember(territorio.getWorkspaceId());
        return territorio;
    }

    @Transactional
    public TerritorioResponse create(TerritorioCreateRequest request) {
        Instant now = Instant.now();
        Territorio territorio = new Territorio();
        territorio.setWorkspaceId(authorizationService.requireAuthorizedWorkspace(request.workspaceId()));
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
        } catch (JacksonException ex) {
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
