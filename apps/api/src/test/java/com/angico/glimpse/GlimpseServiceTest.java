package com.angico.glimpse;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.when;

import com.angico.acoes.AcaoRepository;
import com.angico.common.ClockProvider;
import com.angico.core.memory.MemoryEventRepository;
import com.angico.core.memory.MemoryObjectRepository;
import com.angico.impacto.Indicador;
import com.angico.impacto.IndicadorRepository;
import com.angico.impacto.Medicao;
import com.angico.impacto.MedicaoRepository;
import com.angico.impacto.ResultadoRepository;
import com.angico.missoes.MissaoRepository;
import com.angico.mensagens.ConversationAccessPolicy;
import com.angico.observacoes.ObservacaoRepository;
import com.angico.potencialidades.PotencialidadeRepository;
import com.angico.problemas.ProblemaRepository;
import com.angico.workspaces.Workspace;
import com.angico.workspaces.WorkspaceAuthorizationService;
import com.angico.workspaces.WorkspaceRepository;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class GlimpseServiceTest {

    @Mock private MemoryObjectRepository objects;
    @Mock private MemoryEventRepository events;
    @Mock private ObservacaoRepository observacoes;
    @Mock private ProblemaRepository problemas;
    @Mock private PotencialidadeRepository potencialidades;
    @Mock private MissaoRepository missoes;
    @Mock private AcaoRepository acoes;
    @Mock private ResultadoRepository resultados;
    @Mock private IndicadorRepository indicadores;
    @Mock private MedicaoRepository medicoes;
    @Mock private WorkspaceRepository workspaces;
    @Mock private ClockProvider clock;
    @Mock private WorkspaceAuthorizationService authorization;
    @Mock private ConversationAccessPolicy conversationAccess;

    private GlimpseService service;

    @BeforeEach
    void setUp() {
        service = new GlimpseService(
                objects,
                events,
                observacoes,
                problemas,
                potencialidades,
                missoes,
                acoes,
                resultados,
                indicadores,
                medicoes,
                workspaces,
                clock,
                authorization,
                conversationAccess
        );
    }

    @Test
    void dashboardSeparatesOperationalCountsFromMeasuredIndicators() {
        String workspaceId = "coletivo-rio";
        when(authorization.requireAuthorizedWorkspace(workspaceId)).thenReturn(workspaceId);
        when(clock.now()).thenReturn(Instant.parse("2026-07-10T12:00:00Z"));
        when(observacoes.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId)).thenReturn(List.of());
        when(missoes.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId)).thenReturn(List.of());
        when(resultados.countByWorkspaceId(workspaceId)).thenReturn(2L);
        when(workspaces.findBySlug(workspaceId)).thenReturn(Optional.of(
                new Workspace(workspaceId, "Coletivo do Rio", "actor", Instant.EPOCH)));

        Indicador indicator = new Indicador();
        indicator.setId(42L);
        indicator.setWorkspaceId(workspaceId);
        indicator.setNome("Mudas sobreviventes");
        indicator.setUnidade("un");
        Medicao measurement = new Medicao();
        measurement.setId(9L);
        measurement.setWorkspaceId(workspaceId);
        measurement.setIndicadorId(indicator.getId());
        measurement.setValor(84.0);
        measurement.setUnidade("un");
        measurement.setMeasuredAt(Instant.parse("2026-07-08T15:00:00Z"));
        measurement.setCreatedAt(Instant.parse("2026-07-09T15:00:00Z"));
        Medicao orphan = new Medicao();
        orphan.setId(10L);
        orphan.setWorkspaceId(workspaceId);
        orphan.setIndicadorId(999L);
        orphan.setValor(100.0);
        orphan.setCreatedAt(Instant.parse("2026-07-10T15:00:00Z"));
        when(medicoes.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId))
                .thenReturn(List.of(orphan, measurement));
        when(indicadores.findById(999L)).thenReturn(Optional.empty());
        when(indicadores.findById(42L)).thenReturn(Optional.of(indicator));

        DashboardResponse response = service.dashboard(workspaceId);

        assertEquals("Coletivo do Rio", response.territory().name());
        assertEquals(1, response.impact().size());
        assertEquals("Mudas sobreviventes", response.impact().getFirst().label());
        assertEquals("84 un", response.impact().getFirst().value());
        assertEquals("08/07/2026", response.impact().getFirst().period());
        assertEquals(2L, response.stats().stream()
                .filter(stat -> stat.label().equals("Resultados registrados"))
                .findFirst()
                .orElseThrow()
                .value());
        assertFalse(response.stats().stream()
                .anyMatch(stat -> stat.label().contains("Jovens")));
    }
}
