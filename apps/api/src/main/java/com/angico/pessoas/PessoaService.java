package com.angico.pessoas;

import com.angico.common.ClockProvider;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PessoaService {

    private static final String PAPEL_PADRAO = "Jovem Mapeador";

    private final PessoaRepository pessoaRepository;
    private final PessoaMemoryPublisher pessoaMemoryPublisher;
    private final ClockProvider clock;

    public PessoaService(
            PessoaRepository pessoaRepository,
            PessoaMemoryPublisher pessoaMemoryPublisher,
            ClockProvider clock
    ) {
        this.pessoaRepository = pessoaRepository;
        this.pessoaMemoryPublisher = pessoaMemoryPublisher;
        this.clock = clock;
    }

    /**
     * Registra uma pessoa e a inscreve na memória do território (objeto +
     * evento). Persistência e memória commitam juntas na mesma transação.
     */
    @Transactional
    public PessoaResponse registrar(PessoaRequest request) {
        Pessoa pessoa = new Pessoa(
                request.workspaceId(),
                request.nome(),
                request.papel() == null || request.papel().isBlank()
                        ? PAPEL_PADRAO : request.papel(),
                clock.now()
        );

        Pessoa saved = pessoaRepository.save(pessoa);
        pessoaMemoryPublisher.publicarEngajada(saved);
        return PessoaResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<PessoaResponse> listar(String workspaceId) {
        return pessoaRepository.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId)
                .stream()
                .map(PessoaResponse::from)
                .toList();
    }
}
