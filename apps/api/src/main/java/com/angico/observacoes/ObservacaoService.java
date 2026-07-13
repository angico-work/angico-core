package com.angico.observacoes;

import com.angico.common.ClockProvider;
import com.angico.common.ConflictException;
import com.angico.common.idempotency.IdempotencyOperation;
import com.angico.common.idempotency.IdempotencyRecord;
import com.angico.common.idempotency.IdempotencyService;
import com.angico.workspaces.WorkspaceAuthorizationService;
import com.angico.workspaces.WorkspaceReferenceValidator;
import java.util.List;
import java.util.Objects;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class ObservacaoService {

    private static final String STATUS_INICIAL = "ABERTA";
    private static final String URGENCIA_PADRAO = "MEDIA";
    private static final String RESOURCE_TYPE = "OBSERVACAO";

    private final ObservacaoRepository observacaoRepository;
    private final ObservacaoMemoryPublisher observacaoMemoryPublisher;
    private final ClockProvider clock;
    private final WorkspaceAuthorizationService authorizationService;
    private final WorkspaceReferenceValidator referenceValidator;
    private final IdempotencyService idempotencyService;
    private final TransactionTemplate transactions;

    public ObservacaoService(
            ObservacaoRepository observacaoRepository,
            ObservacaoMemoryPublisher observacaoMemoryPublisher,
            ClockProvider clock,
            WorkspaceAuthorizationService authorizationService,
            WorkspaceReferenceValidator referenceValidator,
            IdempotencyService idempotencyService,
            PlatformTransactionManager transactionManager
    ) {
        this.observacaoRepository = observacaoRepository;
        this.observacaoMemoryPublisher = observacaoMemoryPublisher;
        this.clock = clock;
        this.authorizationService = authorizationService;
        this.referenceValidator = referenceValidator;
        this.idempotencyService = idempotencyService;
        this.transactions = new TransactionTemplate(transactionManager);
    }

    public ObservacaoResponse registrar(ObservacaoCreateRequest request) {
        return registrar(request, null);
    }

    public ObservacaoResponse registrar(ObservacaoCreateRequest request, String rawIdempotencyKey) {
        String workspaceId = authorizationService.requireWritableWorkspace(request.workspaceId());
        String actorId = authorizationService.currentActorId();
        String idempotencyKey = idempotencyService.normalizeKey(rawIdempotencyKey);
        String requestHash = idempotencyKey == null
                ? null
                : idempotencyService.canonicalPayloadHash(canonicalPayload(workspaceId, request));
        try {
            return Objects.requireNonNull(transactions.execute(status -> registerInTransaction(
                    request, workspaceId, actorId, idempotencyKey, requestHash)));
        } catch (DataIntegrityViolationException exception) {
            return recoverAfterConstraint(
                    request, workspaceId, actorId, idempotencyKey, requestHash, exception);
        }
    }

    private ObservacaoResponse registerInTransaction(
            ObservacaoCreateRequest request,
            String workspaceId,
            String actorId,
            String idempotencyKey,
            String requestHash
    ) {
        if (idempotencyKey != null) {
            var existing = idempotencyService.find(
                    workspaceId, actorId, IdempotencyOperation.OBSERVACAO_CREATE, idempotencyKey);
            if (existing.isPresent()) {
                return replay(existing.get(), workspaceId, requestHash);
            }
        }

        requireUnusedClientMutationId(workspaceId, request.clientMutationId());
        referenceValidator.requireTerritorio(request.territorioId(), workspaceId);

        IdempotencyRecord reservation = idempotencyKey == null
                ? null
                : idempotencyService.reserve(
                        workspaceId,
                        actorId,
                        IdempotencyOperation.OBSERVACAO_CREATE,
                        idempotencyKey,
                        requestHash
                );
        var createdAt = clock.now();
        var occurredAt = request.occurredAt() == null ? createdAt : request.occurredAt();
        ObservacaoTerritorial observacao = new ObservacaoTerritorial(
                workspaceId,
                request.territorioId(),
                request.categoria(),
                request.titulo(),
                request.descricao(),
                request.localizacao(),
                request.latitude(),
                request.longitude(),
                request.urgencia() == null || request.urgencia().isBlank()
                        ? URGENCIA_PADRAO : request.urgencia(),
                STATUS_INICIAL,
                actorId,
                request.clientMutationId(),
                occurredAt,
                request.deviceId(),
                createdAt
        );

        observacao.setBairro(request.bairro());
        observacao.setCidade(request.cidade());
        observacao.setEstado(request.estado());

        ObservacaoTerritorial saved = observacaoRepository.save(observacao);
        observacaoMemoryPublisher.publicarRegistrada(
                saved, idempotencyKey, offlineMetadataPresent(request));
        if (reservation != null) {
            reservation.complete(
                    RESOURCE_TYPE,
                    String.valueOf(saved.getId()),
                    201,
                    "application/json",
                    clock.now()
            );
        }
        return ObservacaoResponse.from(saved);
    }

    private ObservacaoResponse recoverAfterConstraint(
            ObservacaoCreateRequest request,
            String workspaceId,
            String actorId,
            String idempotencyKey,
            String requestHash,
            DataIntegrityViolationException original
    ) {
        return Objects.requireNonNull(transactions.execute(status -> {
            if (idempotencyKey != null) {
                var existing = idempotencyService.find(
                        workspaceId, actorId, IdempotencyOperation.OBSERVACAO_CREATE, idempotencyKey);
                if (existing.isPresent()) {
                    return replay(existing.get(), workspaceId, requestHash);
                }
            }
            if (request.clientMutationId() != null
                    && observacaoRepository.findByWorkspaceIdAndClientMutationId(
                            workspaceId, request.clientMutationId()).isPresent()) {
                throw new ConflictException("clientMutationId já foi usado neste workspace.");
            }
            throw original;
        }));
    }

    private ObservacaoResponse replay(
            IdempotencyRecord record,
            String workspaceId,
            String requestHash
    ) {
        idempotencyService.validateReplay(record, requestHash);
        if (!RESOURCE_TYPE.equals(record.getResourceType())) {
            throw new ConflictException("Resultado idempotente incompatível com esta operação.");
        }
        Long observationId;
        try {
            observationId = Long.valueOf(record.getResourceId());
        } catch (NumberFormatException exception) {
            throw new ConflictException("Resultado idempotente inválido.");
        }
        return observacaoRepository.findByIdAndWorkspaceId(observationId, workspaceId)
                .map(ObservacaoResponse::from)
                .orElseThrow(() -> new ConflictException(
                        "Resultado idempotente não está mais disponível."));
    }

    private void requireUnusedClientMutationId(String workspaceId, String clientMutationId) {
        if (clientMutationId != null
                && observacaoRepository.findByWorkspaceIdAndClientMutationId(
                        workspaceId, clientMutationId).isPresent()) {
            throw new ConflictException("clientMutationId já foi usado neste workspace.");
        }
    }

    private boolean offlineMetadataPresent(ObservacaoCreateRequest request) {
        return request.clientMutationId() != null
                || request.occurredAt() != null
                || request.deviceId() != null;
    }

    private CanonicalObservationPayload canonicalPayload(
            String workspaceId,
            ObservacaoCreateRequest request
    ) {
        String urgency = request.urgencia() == null || request.urgencia().isBlank()
                ? URGENCIA_PADRAO : request.urgencia();
        return new CanonicalObservationPayload(
                workspaceId,
                request.territorioId(),
                request.categoria(),
                request.titulo(),
                request.descricao(),
                request.localizacao(),
                request.bairro(),
                request.cidade(),
                request.estado(),
                request.latitude(),
                request.longitude(),
                urgency,
                request.clientMutationId(),
                request.occurredAt() == null ? null : request.occurredAt().toString(),
                request.deviceId()
        );
    }

    @Transactional(readOnly = true)
    public List<ObservacaoResponse> listar(String workspaceId) {
        String authorized = authorizationService.requireAuthorizedWorkspace(workspaceId);
        return observacaoRepository.findByWorkspaceIdOrderByCreatedAtDesc(authorized)
                .stream()
                .map(ObservacaoResponse::from)
                .toList();
    }

    private record CanonicalObservationPayload(
            String workspaceId,
            String territorioId,
            String categoria,
            String titulo,
            String descricao,
            String localizacao,
            String bairro,
            String cidade,
            String estado,
            Double latitude,
            Double longitude,
            String urgencia,
            String clientMutationId,
            String occurredAt,
            String deviceId
    ) {
    }
}
