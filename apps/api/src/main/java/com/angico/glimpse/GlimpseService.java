package com.angico.glimpse;

import com.angico.acoes.AcaoRepository;
import com.angico.common.ClockProvider;
import com.angico.core.memory.MemoryEventRepository;
import com.angico.core.memory.MemoryObjectRepository;
import com.angico.core.memory.StoredMemoryEvent;
import com.angico.impacto.Indicador;
import com.angico.impacto.IndicadorRepository;
import com.angico.impacto.Medicao;
import com.angico.impacto.MedicaoRepository;
import com.angico.impacto.ResultadoRepository;
import com.angico.missoes.Missao;
import com.angico.missoes.MissaoRepository;
import com.angico.mensagens.ConversationAccessPolicy;
import com.angico.observacoes.ObservacaoRepository;
import com.angico.observacoes.ObservacaoTerritorial;
import com.angico.potencialidades.PotencialidadeRepository;
import com.angico.potencialidades.PotencialidadeTerritorial;
import com.angico.problemas.ProblemaRepository;
import com.angico.problemas.ProblemaSocioambiental;
import com.angico.workspaces.WorkspaceAuthorizationService;
import com.angico.workspaces.WorkspaceRepository;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GlimpseService {

    private static final String MEMORY_CLAIM =
            "Contagens operacionais e medições registradas permanecem separadas e rastreáveis.";
    private static final int MAX_ACTIVITIES = 8;
    private static final int MAX_MISSIONS = 6;
    private static final int MAX_MEASUREMENTS = 8;
    private static final DateTimeFormatter MEASUREMENT_DATE =
            DateTimeFormatter.ofPattern("dd/MM/uuuu").withZone(ZoneOffset.UTC);

    private final MemoryObjectRepository objects;
    private final MemoryEventRepository events;
    private final ObservacaoRepository observacoes;
    private final ProblemaRepository problemas;
    private final PotencialidadeRepository potencialidades;
    private final MissaoRepository missoes;
    private final AcaoRepository acoes;
    private final ResultadoRepository resultados;
    private final IndicadorRepository indicadores;
    private final MedicaoRepository medicoes;
    private final WorkspaceRepository workspaces;
    private final ClockProvider clock;
    private final WorkspaceAuthorizationService authorizationService;
    private final ConversationAccessPolicy conversationAccess;

    public GlimpseService(
            MemoryObjectRepository objects,
            MemoryEventRepository events,
            ObservacaoRepository observacoes,
            ProblemaRepository problemas,
            PotencialidadeRepository potencialidades,
            MissaoRepository missoes,
            AcaoRepository acoes,
            ResultadoRepository resultados,
            IndicadorRepository indicadores,
            MedicaoRepository medicoes,
            WorkspaceRepository workspaces,
            ClockProvider clock,
            WorkspaceAuthorizationService authorizationService,
            ConversationAccessPolicy conversationAccess
    ) {
        this.objects = objects;
        this.events = events;
        this.observacoes = observacoes;
        this.problemas = problemas;
        this.potencialidades = potencialidades;
        this.missoes = missoes;
        this.acoes = acoes;
        this.resultados = resultados;
        this.indicadores = indicadores;
        this.medicoes = medicoes;
        this.workspaces = workspaces;
        this.clock = clock;
        this.authorizationService = authorizationService;
        this.conversationAccess = conversationAccess;
    }

    @Transactional(readOnly = true)
    public DashboardResponse dashboard(String workspaceId) {
        workspaceId = authorizationService.requireAuthorizedWorkspace(workspaceId);
        List<ObservacaoTerritorial> recent = observacoes.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId);
        Instant now = clock.now();

        List<DashboardResponse.Stat> stats = List.of(
                new DashboardResponse.Stat("Observações", count(workspaceId, "observacao"), "", "leaf"),
                new DashboardResponse.Stat("Problemas registrados", count(workspaceId, "problema"), "", "warning"),
                new DashboardResponse.Stat("Missões registradas", count(workspaceId, "missao"), "", "target"),
                new DashboardResponse.Stat("Ações registradas", acoes.countByWorkspaceId(workspaceId), "", "check"),
                new DashboardResponse.Stat("Resultados registrados", resultados.countByWorkspaceId(workspaceId), "", "sprout")
        );

        List<DashboardResponse.Activity> activities = recent.stream()
                .limit(MAX_ACTIVITIES)
                .map(o -> new DashboardResponse.Activity(
                        o.getTitulo(),
                        o.getDescricao() == null ? o.getCategoria() : o.getDescricao(),
                        o.getLocalizacao() == null ? "" : o.getLocalizacao(),
                        relativeTime(o.getCreatedAt(), now),
                        "ALTA".equalsIgnoreCase(o.getUrgencia()) ? "warning" : "target"))
                .toList();

        return new DashboardResponse(
                workspaceId,
                territory(workspaceId),
                stats,
                activities,
                missions(workspaceId),
                impact(workspaceId),
                categoryDistribution(recent),
                MEMORY_CLAIM
        );
    }

    @Transactional(readOnly = true)
    public List<MapPoint> mapPoints(String workspaceId) {
        workspaceId = authorizationService.requireAuthorizedWorkspace(workspaceId);
        List<MapPoint> points = new ArrayList<>();
        for (ObservacaoTerritorial o : observacoes.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId)) {
            if (o.getLatitude() != null && o.getLongitude() != null) {
                points.add(new MapPoint("observacao", o.getId(), o.getTitulo(), o.getCategoria(),
                        o.getUrgencia(), o.getLatitude(), o.getLongitude()));
            }
        }
        for (ProblemaSocioambiental p : problemas.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId)) {
            if (p.getLatitude() != null && p.getLongitude() != null) {
                points.add(new MapPoint("problema", p.getId(), p.getTitulo(), p.getCategoria(),
                        p.getStatus(), p.getLatitude(), p.getLongitude()));
            }
        }
        for (PotencialidadeTerritorial pot : potencialidades.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId)) {
            if (pot.getLatitude() != null && pot.getLongitude() != null) {
                points.add(new MapPoint("potencialidade", pot.getId(), pot.getTitulo(), pot.getCategoria(),
                        pot.getStatus(), pot.getLatitude(), pot.getLongitude()));
            }
        }
        return points;
    }

    @Transactional(readOnly = true)
    public List<MemoriaEvent> memoria(String workspaceId) {
        workspaceId = authorizationService.requireAuthorizedWorkspace(workspaceId);
        return events.findByWorkspaceIdOrderBySequenceAsc(workspaceId).stream()
                .filter(event -> conversationAccess.canAccessMemoryNode(
                        event.getWorkspaceId(), event.getEntityType(), event.getEntityId()))
                .sorted(Comparator.comparing(StoredMemoryEvent::getSequence).reversed())
                .limit(100)
                .map(this::toMemoriaEvent)
                .toList();
    }

    private MemoriaEvent toMemoriaEvent(StoredMemoryEvent e) {
        return new MemoriaEvent(e.getSequence(), e.getEntityType(), e.getEntityId(),
                e.getEventType(), e.getActorId(), e.getOccurredAt());
    }

    private long count(String workspaceId, String entityType) {
        return objects.countByWorkspaceIdAndEntityTypeIgnoreCase(workspaceId, entityType);
    }

    private List<DashboardResponse.Mission> missions(String workspaceId) {
        return missoes.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId).stream()
                .limit(MAX_MISSIONS)
                .map(m -> toMission(workspaceId, m))
                .toList();
    }

    private DashboardResponse.Mission toMission(String workspaceId, Missao m) {
        long nAcoes = acoes.countByWorkspaceIdAndMissaoId(workspaceId, String.valueOf(m.getId()));
        return new DashboardResponse.Mission(
                m.getTitulo(),
                m.getProgresso(),
                nAcoes + (nAcoes == 1 ? " ação" : " ações"),
                humanizeStatus(m.getStatus()));
    }

    private List<DashboardResponse.Impact> impact(String workspaceId) {
        List<DashboardResponse.Impact> measured = new ArrayList<>();
        Set<Long> seenIndicators = new HashSet<>();
        for (Medicao medicao : medicoes.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId)) {
            if (measured.size() == MAX_MEASUREMENTS
                    || medicao.getIndicadorId() == null
                    || !seenIndicators.add(medicao.getIndicadorId())) {
                continue;
            }
            Indicador indicador = indicadores.findById(medicao.getIndicadorId())
                    .filter(candidate -> workspaceId.equals(candidate.getWorkspaceId()))
                    .orElse(null);
            if (indicador == null || medicao.getValor() == null) {
                continue;
            }
            String unit = medicao.getUnidade() == null || medicao.getUnidade().isBlank()
                    ? indicador.getUnidade()
                    : medicao.getUnidade();
            String value = BigDecimal.valueOf(medicao.getValor()).stripTrailingZeros().toPlainString();
            if (unit != null && !unit.isBlank()) {
                value += " " + unit.strip();
            }
            Instant measuredAt = medicao.getMeasuredAt() == null
                    ? medicao.getCreatedAt()
                    : medicao.getMeasuredAt();
            if (measuredAt == null) {
                continue;
            }
            measured.add(new DashboardResponse.Impact(
                    value,
                    indicador.getNome(),
                    MEASUREMENT_DATE.format(measuredAt),
                    "target"
            ));
        }
        return List.copyOf(measured);
    }

    private List<DashboardResponse.Category> categoryDistribution(List<ObservacaoTerritorial> observacoes) {
        Map<String, Long> byCategory = new LinkedHashMap<>();
        for (ObservacaoTerritorial o : observacoes) {
            byCategory.merge(o.getCategoria(), 1L, Long::sum);
        }
        List<DashboardResponse.Category> categories = new ArrayList<>();
        byCategory.forEach((name, value) -> categories.add(new DashboardResponse.Category(name, value)));
        return categories;
    }

    private DashboardResponse.Territory territory(String workspaceId) {
        return workspaces.findBySlug(workspaceId)
                .map(workspace -> new DashboardResponse.Territory(
                        workspaceId,
                        workspace.getNome(),
                        workspace.getDescricao() == null || workspace.getDescricao().isBlank()
                                ? "Leitura operacional dos territórios deste workspace"
                                : workspace.getDescricao()
                ))
                .orElseThrow(() -> new IllegalStateException("Workspace autorizado não encontrado."));
    }

    private static String humanizeStatus(String status) {
        if (status == null || status.isBlank()) {
            return "";
        }
        String lower = status.replace('_', ' ').toLowerCase();
        return Character.toUpperCase(lower.charAt(0)) + lower.substring(1);
    }

    private static String relativeTime(Instant from, Instant now) {
        Duration d = Duration.between(from, now);
        long minutes = d.toMinutes();
        if (minutes < 1) {
            return "Agora há pouco";
        }
        if (minutes < 60) {
            return "Há " + minutes + " min";
        }
        long hours = d.toHours();
        if (hours < 24) {
            return "Há " + hours + (hours == 1 ? " hora" : " horas");
        }
        long days = d.toDays();
        return "Há " + days + (days == 1 ? " dia" : " dias");
    }
}
