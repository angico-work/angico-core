package com.angico.impacto;

import com.angico.common.ClockProvider;
import com.angico.workspaces.WorkspaceAuthorizationService;
import com.angico.workspaces.WorkspaceReferenceValidator;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ResultadoService {

    private final ResultadoRepository repository;
    private final ResultadoMemoryPublisher publisher;
    private final WorkspaceAuthorizationService authorization;
    private final WorkspaceReferenceValidator references;
    private final ClockProvider clock;

    public ResultadoService(
            ResultadoRepository repository,
            ResultadoMemoryPublisher publisher,
            WorkspaceAuthorizationService authorization,
            WorkspaceReferenceValidator references,
            ClockProvider clock
    ) {
        this.repository = repository;
        this.publisher = publisher;
        this.authorization = authorization;
        this.references = references;
        this.clock = clock;
    }

    @Transactional
    public ResultadoResponse create(ResultadoRequest request) {
        String workspaceId = authorization.requireAuthorizedWorkspace(request.workspaceId());
        references.requireAcao(String.valueOf(request.acaoId()), workspaceId);
        Instant now = clock.now();
        Instant occurredAt = validateOccurredAt(request.occurredAt(), now);

        Resultado result = new Resultado();
        result.setWorkspaceId(workspaceId);
        result.setAcaoId(request.acaoId());
        result.setTitulo(request.titulo().strip());
        result.setDescricao(normalize(request.descricao()));
        result.setStatus("REGISTRADO");
        result.setActorId(authorization.currentActorId());
        result.setOccurredAt(occurredAt);
        result.setCreatedAt(now);
        result = repository.save(result);
        publisher.publish(result);
        return ResultadoResponse.from(result);
    }

    @Transactional(readOnly = true)
    public List<ResultadoResponse> list(String requestedWorkspaceId, Long actionId) {
        String workspaceId = authorization.requireAuthorizedWorkspace(requestedWorkspaceId);
        List<Resultado> results;
        if (actionId == null) {
            results = repository.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId);
        } else {
            references.requireAcao(String.valueOf(actionId), workspaceId);
            results = repository.findByWorkspaceIdAndAcaoIdOrderByCreatedAtDesc(workspaceId, actionId);
        }
        return results.stream().map(ResultadoResponse::from).toList();
    }

    private Instant validateOccurredAt(Instant requested, Instant now) {
        Instant value = requested == null ? now : requested;
        if (value.isBefore(Instant.parse("2000-01-01T00:00:00Z"))
                || value.isAfter(now.plus(5, ChronoUnit.MINUTES))) {
            throw new IllegalArgumentException("occurredAt está fora do intervalo permitido.");
        }
        return value;
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }
}
