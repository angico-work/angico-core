package com.angico.offline;

import com.angico.acoes.AcaoCreateRequest;
import com.angico.acoes.AcaoService;
import com.angico.common.ClockProvider;
import com.angico.common.ConflictException;
import com.angico.common.idempotency.IdempotencyOperation;
import com.angico.common.idempotency.IdempotencyRecord;
import com.angico.common.idempotency.IdempotencyService;
import com.angico.impacto.ImpactoService;
import com.angico.impacto.IndicadorRequest;
import com.angico.impacto.MedicaoRequest;
import com.angico.impacto.ResultadoRequest;
import com.angico.impacto.ResultadoService;
import com.angico.missoes.MissaoRequest;
import com.angico.missoes.MissaoService;
import com.angico.potencialidades.PotencialidadeCreateRequest;
import com.angico.potencialidades.PotencialidadeService;
import com.angico.problemas.ProblemaRequest;
import com.angico.problemas.ProblemaService;
import com.angico.recursos.RecursoRequest;
import com.angico.recursos.RecursoService;
import com.angico.workspaces.WorkspaceAuthorizationService;
import java.util.Objects;
import java.util.function.Function;
import java.util.function.Supplier;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class OfflineMutationService {

    private static final int CREATED = 201;
    private static final String JSON = "application/json";

    private final ProblemaService problemaService;
    private final PotencialidadeService potencialidadeService;
    private final MissaoService missaoService;
    private final AcaoService acaoService;
    private final ResultadoService resultadoService;
    private final ImpactoService impactoService;
    private final RecursoService recursoService;
    private final WorkspaceAuthorizationService authorization;
    private final IdempotencyService idempotency;
    private final ClockProvider clock;
    private final TransactionTemplate transactions;

    public OfflineMutationService(
            ProblemaService problemaService,
            PotencialidadeService potencialidadeService,
            MissaoService missaoService,
            AcaoService acaoService,
            ResultadoService resultadoService,
            ImpactoService impactoService,
            RecursoService recursoService,
            WorkspaceAuthorizationService authorization,
            IdempotencyService idempotency,
            ClockProvider clock,
            PlatformTransactionManager transactionManager
    ) {
        this.problemaService = problemaService;
        this.potencialidadeService = potencialidadeService;
        this.missaoService = missaoService;
        this.acaoService = acaoService;
        this.resultadoService = resultadoService;
        this.impactoService = impactoService;
        this.recursoService = recursoService;
        this.authorization = authorization;
        this.idempotency = idempotency;
        this.clock = clock;
        this.transactions = new TransactionTemplate(transactionManager);
    }

    public OfflineMutationReceipt createProblem(ProblemaRequest request, String rawKey) {
        return execute(
                IdempotencyOperation.PROBLEMA_CREATE,
                "PROBLEMA",
                request.workspaceId(),
                request,
                rawKey,
                () -> problemaService.registrar(request),
                response -> String.valueOf(response.id())
        );
    }

    public OfflineMutationReceipt createPotential(
            PotencialidadeCreateRequest request,
            String rawKey
    ) {
        return execute(
                IdempotencyOperation.POTENCIALIDADE_CREATE,
                "POTENCIALIDADE",
                request.workspaceId(),
                request,
                rawKey,
                () -> potencialidadeService.registrar(request),
                response -> String.valueOf(response.id())
        );
    }

    public OfflineMutationReceipt createMission(MissaoRequest request, String rawKey) {
        return execute(
                IdempotencyOperation.MISSAO_CREATE,
                "MISSAO",
                request.workspaceId(),
                request,
                rawKey,
                () -> missaoService.registrar(request),
                response -> String.valueOf(response.id())
        );
    }

    public OfflineMutationReceipt createAction(AcaoCreateRequest request, String rawKey) {
        return execute(
                IdempotencyOperation.ACAO_CREATE,
                "ACAO",
                request.workspaceId(),
                request,
                rawKey,
                () -> acaoService.registrar(request),
                response -> String.valueOf(response.id())
        );
    }

    public OfflineMutationReceipt createResult(ResultadoRequest request, String rawKey) {
        return execute(
                IdempotencyOperation.RESULTADO_CREATE,
                "RESULTADO",
                request.workspaceId(),
                request,
                rawKey,
                () -> resultadoService.create(request),
                response -> String.valueOf(response.id())
        );
    }

    public OfflineMutationReceipt createIndicator(IndicadorRequest request, String rawKey) {
        return execute(
                IdempotencyOperation.INDICADOR_CREATE,
                "INDICADOR",
                request.workspaceId(),
                request,
                rawKey,
                () -> impactoService.createIndicador(request),
                response -> String.valueOf(response.getId())
        );
    }

    public OfflineMutationReceipt createMeasurement(MedicaoRequest request, String rawKey) {
        return execute(
                IdempotencyOperation.MEDICAO_CREATE,
                "MEDICAO",
                request.workspaceId(),
                request,
                rawKey,
                () -> impactoService.createMedicao(request),
                response -> String.valueOf(response.getId())
        );
    }

    public OfflineMutationReceipt createResource(RecursoRequest request, String rawKey) {
        return execute(
                IdempotencyOperation.RECURSO_CREATE,
                "RECURSO",
                request.workspaceId(),
                request,
                rawKey,
                () -> recursoService.create(request),
                response -> String.valueOf(response.getId())
        );
    }

    public OfflineMutationReceipt createResourceUsage(
            RecursoUsoMutationRequest request,
            String rawKey
    ) {
        return execute(
                IdempotencyOperation.RECURSO_USO_CREATE,
                "USO_RECURSO",
                request.payload().workspaceId(),
                request,
                rawKey,
                () -> recursoService.use(request.recursoId(), request.payload()),
                response -> String.valueOf(response.getId())
        );
    }

    private <T> OfflineMutationReceipt execute(
            IdempotencyOperation operation,
            String resourceType,
            String requestedWorkspaceId,
            Object payload,
            String rawKey,
            Supplier<T> mutation,
            Function<T, String> resourceId
    ) {
        String workspaceId = authorization.requireAuthorizedWorkspace(requestedWorkspaceId);
        String actorId = authorization.currentActorId();
        String key = idempotency.normalizeKey(rawKey);
        if (key == null) {
            throw new IllegalArgumentException("Idempotency-Key é obrigatória para mutações offline.");
        }
        String requestHash = idempotency.canonicalPayloadHash(
                new CanonicalPayload(operation, workspaceId, payload));
        try {
            return Objects.requireNonNull(transactions.execute(status -> executeInTransaction(
                    operation, resourceType, workspaceId, actorId, key, requestHash, mutation, resourceId)));
        } catch (DataIntegrityViolationException exception) {
            return Objects.requireNonNull(transactions.execute(status -> recoverAfterConstraint(
                    operation, resourceType, workspaceId, actorId, key, requestHash, exception)));
        }
    }

    private <T> OfflineMutationReceipt executeInTransaction(
            IdempotencyOperation operation,
            String resourceType,
            String workspaceId,
            String actorId,
            String key,
            String requestHash,
            Supplier<T> mutation,
            Function<T, String> resourceId
    ) {
        var existing = idempotency.find(workspaceId, actorId, operation, key);
        if (existing.isPresent()) {
            return replay(existing.get(), operation, resourceType, workspaceId, key, requestHash);
        }
        IdempotencyRecord reservation = idempotency.reserve(
                workspaceId, actorId, operation, key, requestHash);
        T created = mutation.get();
        String id = requirePositiveId(resourceId.apply(created));
        reservation.complete(resourceType, id, CREATED, JSON, clock.now());
        return new OfflineMutationReceipt(operation, workspaceId, key, id);
    }

    private OfflineMutationReceipt recoverAfterConstraint(
            IdempotencyOperation operation,
            String resourceType,
            String workspaceId,
            String actorId,
            String key,
            String requestHash,
            DataIntegrityViolationException original
    ) {
        return idempotency.find(workspaceId, actorId, operation, key)
                .map(record -> replay(record, operation, resourceType, workspaceId, key, requestHash))
                .orElseThrow(() -> original);
    }

    private OfflineMutationReceipt replay(
            IdempotencyRecord record,
            IdempotencyOperation operation,
            String resourceType,
            String workspaceId,
            String key,
            String requestHash
    ) {
        idempotency.validateReplay(record, requestHash);
        if (!resourceType.equals(record.getResourceType())
                || !Integer.valueOf(CREATED).equals(record.getResponseStatus())) {
            throw new ConflictException("Resultado idempotente incompatível com esta operação.");
        }
        return new OfflineMutationReceipt(
                operation,
                workspaceId,
                key,
                requirePositiveId(record.getResourceId())
        );
    }

    private String requirePositiveId(String rawId) {
        try {
            long id = Long.parseLong(rawId);
            if (id < 1) throw new NumberFormatException("non-positive");
            return String.valueOf(id);
        } catch (NumberFormatException | NullPointerException exception) {
            throw new ConflictException("Resultado idempotente inválido.");
        }
    }

    private record CanonicalPayload(
            IdempotencyOperation operation,
            String workspaceId,
            Object payload
    ) {
    }
}
