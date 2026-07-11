package com.angico.territorios;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import com.angico.common.ClockProvider;
import com.angico.core.memory.MemoryEvent;
import com.angico.core.memory.OperationalMemoryService;
import com.angico.workspaces.WorkspaceAuthorizationService;
import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TerritorioService {

    private final TerritorioRepository territorioRepository;
    private final OperationalMemoryService memoryService;
    private final WorkspaceAuthorizationService authorizationService;
    private final ObjectMapper objectMapper;
    private final ClockProvider clock;

    public TerritorioService(
            TerritorioRepository territorioRepository,
            OperationalMemoryService memoryService,
            WorkspaceAuthorizationService authorizationService,
            ObjectMapper objectMapper,
            ClockProvider clock
    ) {
        this.territorioRepository = territorioRepository;
        this.memoryService = memoryService;
        this.authorizationService = authorizationService;
        this.objectMapper = objectMapper;
        this.clock = clock;
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

    @Transactional
    public TerritorioResponse create(TerritorioCreateRequest request) {
        validateCoordinates(request.latitude(), request.longitude());
        validateBoundingBox(request.boundingBox());
        Instant now = clock.now();
        Territorio territorio = new Territorio();
        territorio.setWorkspaceId(authorizationService.requireAuthorizedWorkspace(request.workspaceId()));
        territorio.setNome(requireText(request.nome(), "nome"));
        territorio.setTipo(defaultText(request.tipo(), "BAIRRO"));
        territorio.setCidade(request.cidade());
        territorio.setBairro(request.bairro());
        territorio.setEstado(request.estado());
        territorio.setPais(defaultText(request.pais(), "Brasil"));
        territorio.setLatitude(request.latitude());
        territorio.setLongitude(request.longitude());
        territorio.setBoundingBox(toJson(request.boundingBox()));
        territorio.setStatus("ATIVO");
        territorio.setCreatedAt(now);
        territorio.setUpdatedAt(now);
        territorio = territorioRepository.save(territorio);

        String entityId = String.valueOf(territorio.getId());
        String actorId = authorizationService.currentActorId();
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
                actorId,
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

    private void validateCoordinates(Double latitude, Double longitude) {
        if ((latitude == null) != (longitude == null)) {
            throw new IllegalArgumentException("Latitude e longitude devem ser informadas juntas.");
        }
        if (latitude != null && (!Double.isFinite(latitude) || !Double.isFinite(longitude)
                || latitude < -90 || latitude > 90
                || longitude < -180 || longitude > 180)) {
            throw new IllegalArgumentException("Coordenadas inválidas.");
        }
    }

    private void validateBoundingBox(List<Double> values) {
        if (values == null || values.isEmpty()) {
            return;
        }
        if (values.size() != 4 || values.stream().anyMatch(value -> value == null || !Double.isFinite(value))) {
            throw new IllegalArgumentException("boundingBox deve conter quatro coordenadas finitas.");
        }
        double south = values.get(0);
        double north = values.get(1);
        double west = values.get(2);
        double east = values.get(3);
        if (south < -90 || north > 90 || west < -180 || east > 180
                || south > north || west > east) {
            throw new IllegalArgumentException("boundingBox inválido.");
        }
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
