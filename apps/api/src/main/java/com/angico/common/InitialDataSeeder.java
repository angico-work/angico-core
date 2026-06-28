package com.angico.common;

import com.angico.acoes.AcaoRequest;
import com.angico.acoes.AcaoService;
import com.angico.auth.AuthService;
import com.angico.impacto.ImpactoService;
import com.angico.impacto.IndicadorRequest;
import com.angico.impacto.MedicaoRequest;
import com.angico.impacto.ResultadoRepository;
import com.angico.missoes.MissaoRequest;
import com.angico.missoes.MissaoService;
import com.angico.observacoes.ObservacaoCreateRequest;
import com.angico.observacoes.ObservacaoService;
import com.angico.territorios.TerritorioCreateRequest;
import com.angico.territorios.TerritorioRepository;
import com.angico.territorios.TerritorioService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class InitialDataSeeder implements CommandLineRunner {

    private final TerritorioRepository territorioRepository;
    private final TerritorioService territorioService;
    private final ObservacaoService observacaoService;
    private final MissaoService missaoService;
    private final AcaoService acaoService;
    private final ImpactoService impactoService;
    private final ResultadoRepository resultadoRepository;
    private final AuthService authService;
    private final boolean seedLeadersEnabled;
    private final String seedLeaderPassword;

    public InitialDataSeeder(
            TerritorioRepository territorioRepository,
            TerritorioService territorioService,
            ObservacaoService observacaoService,
            MissaoService missaoService,
            AcaoService acaoService,
            ImpactoService impactoService,
            ResultadoRepository resultadoRepository,
            AuthService authService,
            @Value("${angico.auth.seed-leaders-enabled:true}") boolean seedLeadersEnabled,
            @Value("${angico.auth.seed-leader-password}") String seedLeaderPassword
    ) {
        this.territorioRepository = territorioRepository;
        this.territorioService = territorioService;
        this.observacaoService = observacaoService;
        this.missaoService = missaoService;
        this.acaoService = acaoService;
        this.impactoService = impactoService;
        this.resultadoRepository = resultadoRepository;
        this.authService = authService;
        this.seedLeadersEnabled = seedLeadersEnabled;
        this.seedLeaderPassword = seedLeaderPassword;
    }

    @Override
    public void run(String... args) {
        seedLeaders();

        if (territorioRepository.count() > 0) {
            return;
        }

        var territorio = territorioService.create(new TerritorioCreateRequest(
                TerritorioService.DEFAULT_WORKSPACE_ID,
                "Pinheiros, São Paulo",
                "BAIRRO",
                "São Paulo",
                "Pinheiros",
                "São Paulo",
                "Brasil",
                -23.5614,
                -46.7019,
                java.util.List.of(-23.5850, -23.5400, -46.7250, -46.6750)
        ));

        var observacao = observacaoService.create(new ObservacaoCreateRequest(
                territorio.workspaceId(),
                territorio.id(),
                "Acúmulo de resíduos perto de ponto de ônibus",
                "Moradores relatam descarte recorrente em uma esquina de alto fluxo.",
                "Resíduos",
                "PROBLEMA",
                "SUBMETIDA",
                4,
                "Relato textual com endereço aproximado e recorrência semanal.",
                "Rua Cardeal Arcoverde",
                "São Paulo",
                "Pinheiros",
                -23.5602,
                -46.6962,
                "operador-semente"
        ));

        var missao = missaoService.create(new MissaoRequest(
                territorio.workspaceId(),
                territorio.id(),
                observacao.problemaId(),
                "Organizar resposta comunitária para descarte irregular",
                "Mobilizar moradores, parceiros locais e rota de coleta para reduzir recorrência.",
                "ALTA",
                -23.5602,
                -46.6962,
                "rede-local-pinheiros",
                "operador-semente"
        ));
        missaoService.iniciar(missao.id(), new MissaoRequest(
                territorio.workspaceId(),
                territorio.id(),
                observacao.problemaId(),
                missao.titulo(),
                missao.descricao(),
                missao.prioridade(),
                missao.latitude(),
                missao.longitude(),
                missao.organizacaoId(),
                "operador-semente"
        ));

        var acao = acaoService.create(new AcaoRequest(
                territorio.workspaceId(),
                territorio.id(),
                missao.id(),
                "Mapear pontos de descarte e acionar coleta",
                "Registrar pontos recorrentes e consolidar rota de retirada.",
                "operador-semente",
                "Pontos priorizados e retirada inicial registrada.",
                -23.5602,
                -46.6962,
                "operador-semente"
        ));
        acaoService.concluir(acao.id(), new AcaoRequest(
                territorio.workspaceId(),
                territorio.id(),
                missao.id(),
                acao.titulo(),
                acao.descricao(),
                acao.responsavelId(),
                "Retirada inicial concluída e rota ajustada.",
                acao.latitude(),
                acao.longitude(),
                "operador-semente"
        ));

        var resultado = resultadoRepository.findByAcaoIdOrderByCreatedAtDesc(acao.id()).stream()
                .findFirst()
                .orElseThrow();

        var indicador = impactoService.createIndicador(new IndicadorRequest(
                territorio.workspaceId(),
                territorio.id(),
                resultado.getId(),
                "Resíduos removidos",
                "kg",
                "Mede volume removido em ações territoriais.",
                "operador-semente"
        ));
        impactoService.createMedicao(new MedicaoRequest(
                territorio.workspaceId(),
                indicador.getId(),
                120.0,
                "kg",
                "Registro de campo",
                "operador-semente",
                null
        ));
    }

    private void seedLeaders() {
        if (!seedLeadersEnabled) {
            return;
        }
        authService.ensureLeader(
                TerritorioService.DEFAULT_WORKSPACE_ID,
                "Líder Angico",
                "lider@angico.local",
                "lider",
                "COORDENACAO",
                seedLeaderPassword
        );
        authService.ensureLeader(
                TerritorioService.DEFAULT_WORKSPACE_ID,
                "Líder de Campo",
                "campo@angico.local",
                "campo",
                "CAMPO",
                seedLeaderPassword
        );
    }
}
