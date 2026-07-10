package com.angico.workspaces;

import com.angico.acoes.Acao;
import com.angico.acoes.AcaoRepository;
import com.angico.common.ForbiddenException;
import com.angico.impacto.Indicador;
import com.angico.impacto.IndicadorRepository;
import com.angico.impacto.Resultado;
import com.angico.impacto.ResultadoRepository;
import com.angico.missoes.Missao;
import com.angico.missoes.MissaoRepository;
import com.angico.observacoes.ObservacaoRepository;
import com.angico.observacoes.ObservacaoTerritorial;
import com.angico.pessoas.Pessoa;
import com.angico.pessoas.PessoaRepository;
import com.angico.potencialidades.PotencialidadeRepository;
import com.angico.potencialidades.PotencialidadeTerritorial;
import com.angico.problemas.ProblemaRepository;
import com.angico.problemas.ProblemaSocioambiental;
import com.angico.territorios.Territorio;
import com.angico.territorios.TerritorioRepository;
import java.util.Optional;
import java.util.function.Function;
import org.springframework.stereotype.Service;

@Service
public class WorkspaceReferenceValidator {

    private final TerritorioRepository territorioRepository;
    private final ObservacaoRepository observacaoRepository;
    private final ProblemaRepository problemaRepository;
    private final PotencialidadeRepository potencialidadeRepository;
    private final MissaoRepository missaoRepository;
    private final AcaoRepository acaoRepository;
    private final PessoaRepository pessoaRepository;
    private final ResultadoRepository resultadoRepository;
    private final IndicadorRepository indicadorRepository;
    private final WorkspaceMemberRepository memberRepository;

    public WorkspaceReferenceValidator(
            TerritorioRepository territorioRepository,
            ObservacaoRepository observacaoRepository,
            ProblemaRepository problemaRepository,
            PotencialidadeRepository potencialidadeRepository,
            MissaoRepository missaoRepository,
            AcaoRepository acaoRepository,
            PessoaRepository pessoaRepository,
            ResultadoRepository resultadoRepository,
            IndicadorRepository indicadorRepository,
            WorkspaceMemberRepository memberRepository
    ) {
        this.territorioRepository = territorioRepository;
        this.observacaoRepository = observacaoRepository;
        this.problemaRepository = problemaRepository;
        this.potencialidadeRepository = potencialidadeRepository;
        this.missaoRepository = missaoRepository;
        this.acaoRepository = acaoRepository;
        this.pessoaRepository = pessoaRepository;
        this.resultadoRepository = resultadoRepository;
        this.indicadorRepository = indicadorRepository;
        this.memberRepository = memberRepository;
    }

    public Territorio requireTerritorio(String rawId, String workspaceId) {
        return optional(rawId, "Território", territorioRepository::findById,
                Territorio::getWorkspaceId, workspaceId);
    }

    public Territorio requireTerritorio(Long id, String workspaceId) {
        if (id == null) {
            throw new IllegalArgumentException("Território é obrigatório.");
        }
        return required(id, "Território", territorioRepository::findById,
                Territorio::getWorkspaceId, workspaceId);
    }

    public ObservacaoTerritorial requireObservacao(String rawId, String workspaceId) {
        return optional(rawId, "Observação", observacaoRepository::findById,
                ObservacaoTerritorial::getWorkspaceId, workspaceId);
    }

    public ProblemaSocioambiental requireProblema(String rawId, String workspaceId) {
        return optional(rawId, "Problema", problemaRepository::findById,
                ProblemaSocioambiental::getWorkspaceId, workspaceId);
    }

    public PotencialidadeTerritorial requirePotencialidade(String rawId, String workspaceId) {
        return optional(rawId, "Potencialidade", potencialidadeRepository::findById,
                PotencialidadeTerritorial::getWorkspaceId, workspaceId);
    }

    public Missao requireMissao(String rawId, String workspaceId) {
        return optional(rawId, "Missão", missaoRepository::findById,
                Missao::getWorkspaceId, workspaceId);
    }

    public Acao requireAcao(String rawId, String workspaceId) {
        return optional(rawId, "Ação", acaoRepository::findById,
                Acao::getWorkspaceId, workspaceId);
    }

    public Pessoa requirePessoa(String rawId, String workspaceId) {
        if (rawId == null || rawId.isBlank()) {
            return null;
        }
        long id = parseId(rawId, "Pessoa");
        Pessoa pessoa = pessoaRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Pessoa não encontrada: " + id));
        String actorId = pessoa.getAngicoId();
        boolean activeMember = actorId != null && memberRepository
                .findByWorkspaceIdAndActorId(workspaceId, actorId)
                .filter(member -> "ACTIVE".equalsIgnoreCase(member.getStatus()))
                .isPresent();
        if (!activeMember) {
            throw new ForbiddenException("Pessoa fora do workspace autorizado.");
        }
        return pessoa;
    }

    public Resultado requireResultado(Long id, String workspaceId) {
        if (id == null) {
            return null;
        }
        return required(id, "Resultado", resultadoRepository::findById,
                Resultado::getWorkspaceId, workspaceId);
    }

    public void requireLinkableEntity(String type, String rawId, String workspaceId) {
        switch (type) {
            case "TERRITORIO" -> requireTerritorio(parseId(rawId, "Território"), workspaceId);
            case "OBSERVACAO" -> required(parseId(rawId, "Observação"), "Observação",
                    observacaoRepository::findById, ObservacaoTerritorial::getWorkspaceId, workspaceId);
            case "PROBLEMA" -> required(parseId(rawId, "Problema"), "Problema",
                    problemaRepository::findById, ProblemaSocioambiental::getWorkspaceId, workspaceId);
            case "POTENCIALIDADE" -> required(parseId(rawId, "Potencialidade"), "Potencialidade",
                    potencialidadeRepository::findById, PotencialidadeTerritorial::getWorkspaceId, workspaceId);
            case "MISSAO" -> required(parseId(rawId, "Missão"), "Missão",
                    missaoRepository::findById, Missao::getWorkspaceId, workspaceId);
            case "ACAO" -> required(parseId(rawId, "Ação"), "Ação",
                    acaoRepository::findById, Acao::getWorkspaceId, workspaceId);
            case "RESULTADO" -> required(parseId(rawId, "Resultado"), "Resultado",
                    resultadoRepository::findById, Resultado::getWorkspaceId, workspaceId);
            case "INDICADOR" -> required(parseId(rawId, "Indicador"), "Indicador",
                    indicadorRepository::findById, Indicador::getWorkspaceId, workspaceId);
            default -> throw new IllegalArgumentException("Tipo de referência não suportado: " + type);
        }
    }

    private <T> T optional(
            String rawId,
            String label,
            Function<Long, Optional<T>> finder,
            Function<T, String> workspace,
            String expectedWorkspace
    ) {
        if (rawId == null || rawId.isBlank()) {
            return null;
        }
        return required(parseId(rawId, label), label, finder, workspace, expectedWorkspace);
    }

    private <T> T required(
            long id,
            String label,
            Function<Long, Optional<T>> finder,
            Function<T, String> workspace,
            String expectedWorkspace
    ) {
        T entity = finder.apply(id)
                .orElseThrow(() -> new IllegalArgumentException(label + " não encontrado: " + id));
        if (!expectedWorkspace.equals(workspace.apply(entity))) {
            throw new ForbiddenException(label + " fora do workspace autorizado.");
        }
        return entity;
    }

    private long parseId(String rawId, String label) {
        try {
            long id = Long.parseLong(rawId.trim());
            if (id < 1) {
                throw new NumberFormatException("non-positive");
            }
            return id;
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException(label + " inválido: " + rawId, exception);
        }
    }
}
