package com.angico.evidencias;

import com.angico.common.ClockProvider;
import com.angico.common.ConflictException;
import com.angico.common.idempotency.IdempotencyOperation;
import com.angico.common.idempotency.IdempotencyRecord;
import com.angico.common.idempotency.IdempotencyService;
import com.angico.core.ontology.OntologyService;
import com.angico.workspaces.WorkspaceAuthorizationService;
import com.angico.workspaces.WorkspaceReferenceValidator;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.core.io.Resource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;

@Service
public class EvidenciaService {

    private static final Set<String> SUBJECT_TYPES = Set.of(
            OntologyService.OBSERVACAO, OntologyService.ACAO, OntologyService.RESULTADO);
    private static final Pattern OFFLINE_ID = Pattern.compile("[A-Za-z0-9._:-]{1,128}");
    private static final String RESOURCE_TYPE = OntologyService.EVIDENCIA;

    private final EvidenciaRepository evidenciaRepository;
    private final EvidenciaStorageService storage;
    private final EvidenciaMemoryPublisher publisher;
    private final WorkspaceAuthorizationService authorization;
    private final WorkspaceReferenceValidator references;
    private final ClockProvider clock;
    private final IdempotencyService idempotencyService;
    private final TransactionTemplate transactions;

    public EvidenciaService(
            EvidenciaRepository evidenciaRepository,
            EvidenciaStorageService storage,
            EvidenciaMemoryPublisher publisher,
            WorkspaceAuthorizationService authorization,
            WorkspaceReferenceValidator references,
            ClockProvider clock,
            IdempotencyService idempotencyService,
            PlatformTransactionManager transactionManager
    ) {
        this.evidenciaRepository = evidenciaRepository;
        this.storage = storage;
        this.publisher = publisher;
        this.authorization = authorization;
        this.references = references;
        this.clock = clock;
        this.idempotencyService = idempotencyService;
        this.transactions = new TransactionTemplate(transactionManager);
    }

    public EvidenciaMetadataResponse create(
            String requestedWorkspaceId,
            String requestedSubjectType,
            Long subjectId,
            String title,
            String description,
            Instant capturedAt,
            String deviceId,
            String clientMutationId,
            String rawIdempotencyKey,
            MultipartFile file
    ) {
        String workspaceId = authorization.requireAuthorizedWorkspace(requestedWorkspaceId);
        String actorId = authorization.currentActorId();
        String subjectType = normalizeSubject(requestedSubjectType, subjectId);
        String safeTitle = requiredText(title, "title", 200);
        String safeDescription = optionalText(description, "description", 2000);
        String safeDeviceId = optionalOfflineId(deviceId, "deviceId");
        String safeMutationId = optionalOfflineId(clientMutationId, "clientMutationId");
        String headerKey = idempotencyService.normalizeKey(rawIdempotencyKey);
        if (safeMutationId != null && headerKey != null && !safeMutationId.equals(headerKey)) {
            throw new IllegalArgumentException("clientMutationId deve coincidir com Idempotency-Key.");
        }
        String idempotencyKey = headerKey == null ? safeMutationId : headerKey;
        if (safeMutationId == null) {
            safeMutationId = idempotencyKey;
        }
        Instant now = clock.now();
        Instant captureTime = validateCapturedAt(capturedAt, now);
        EvidenciaStorageService.PreparedEvidence preparedFile = file == null
                ? null
                : storage.prepare(file);
        CanonicalEvidencePayload payload = new CanonicalEvidencePayload(
                workspaceId,
                subjectType,
                subjectId,
                safeTitle,
                safeDescription,
                capturedAt == null ? null : captureTime.toString(),
                safeDeviceId,
                safeMutationId,
                preparedFile == null ? null : new CanonicalFilePayload(
                        preparedFile.originalFilename(),
                        preparedFile.contentType(),
                        preparedFile.sizeBytes(),
                        preparedFile.sha256())
        );
        String requestHash = idempotencyKey == null
                ? null
                : idempotencyService.canonicalPayloadHash(payload);
        String finalMutationId = safeMutationId;
        try {
            return Objects.requireNonNull(transactions.execute(status -> createInTransaction(
                    workspaceId,
                    actorId,
                    subjectType,
                    subjectId,
                    safeTitle,
                    safeDescription,
                    captureTime,
                    safeDeviceId,
                    finalMutationId,
                    idempotencyKey,
                    requestHash,
                    preparedFile
            )));
        } catch (DataIntegrityViolationException exception) {
            return recoverAfterConstraint(
                    workspaceId, actorId, finalMutationId, idempotencyKey, requestHash, exception);
        }
    }

    private EvidenciaMetadataResponse createInTransaction(
            String workspaceId,
            String actorId,
            String subjectType,
            Long subjectId,
            String title,
            String description,
            Instant capturedAt,
            String deviceId,
            String clientMutationId,
            String idempotencyKey,
            String requestHash,
            EvidenciaStorageService.PreparedEvidence preparedFile
    ) {
        if (idempotencyKey != null) {
            var existing = idempotencyService.find(
                    workspaceId, actorId, IdempotencyOperation.EVIDENCIA_CREATE, idempotencyKey);
            if (existing.isPresent()) {
                return replay(existing.get(), workspaceId, requestHash);
            }
        }
        if (clientMutationId != null && evidenciaRepository
                .findByWorkspaceIdAndClientMutationId(workspaceId, clientMutationId)
                .isPresent()) {
            throw new ConflictException("clientMutationId já foi usado neste workspace.");
        }
        references.requireLinkableEntity(subjectType, String.valueOf(subjectId), workspaceId);
        IdempotencyRecord reservation = idempotencyKey == null
                ? null
                : idempotencyService.reserve(
                        workspaceId,
                        actorId,
                        IdempotencyOperation.EVIDENCIA_CREATE,
                        idempotencyKey,
                        requestHash
                );

        EvidenciaStorageService.StoredEvidence stored = preparedFile == null
                ? null
                : storage.store(preparedFile);
        registerRollbackCleanup(stored);

        Evidencia evidence = new Evidencia(
                workspaceId,
                subjectType,
                subjectId,
                title,
                description,
                capturedAt,
                clock.now(),
                actorId,
                deviceId,
                clientMutationId
        );
        if (stored != null) {
            evidence.attach(stored);
        }
        evidence = evidenciaRepository.saveAndFlush(evidence);
        publisher.publish(evidence);
        if (reservation != null) {
            reservation.complete(
                    RESOURCE_TYPE,
                    String.valueOf(evidence.getId()),
                    201,
                    "application/json",
                    clock.now()
            );
        }
        return EvidenciaMetadataResponse.from(evidence);
    }

    private EvidenciaMetadataResponse recoverAfterConstraint(
            String workspaceId,
            String actorId,
            String clientMutationId,
            String idempotencyKey,
            String requestHash,
            DataIntegrityViolationException original
    ) {
        return Objects.requireNonNull(transactions.execute(status -> {
            if (idempotencyKey != null) {
                var existing = idempotencyService.find(
                        workspaceId, actorId, IdempotencyOperation.EVIDENCIA_CREATE, idempotencyKey);
                if (existing.isPresent()) {
                    return replay(existing.get(), workspaceId, requestHash);
                }
            }
            if (clientMutationId != null && evidenciaRepository
                    .findByWorkspaceIdAndClientMutationId(workspaceId, clientMutationId)
                    .isPresent()) {
                throw new ConflictException("clientMutationId já foi usado neste workspace.");
            }
            throw original;
        }));
    }

    private EvidenciaMetadataResponse replay(
            IdempotencyRecord record,
            String workspaceId,
            String requestHash
    ) {
        idempotencyService.validateReplay(record, requestHash);
        if (!RESOURCE_TYPE.equals(record.getResourceType())) {
            throw new ConflictException("Resultado idempotente incompatível com evidência.");
        }
        long evidenceId;
        try {
            evidenceId = Long.parseLong(record.getResourceId());
        } catch (NumberFormatException exception) {
            throw new ConflictException("Resultado idempotente inválido.");
        }
        return evidenciaRepository.findByIdAndWorkspaceId(evidenceId, workspaceId)
                .map(EvidenciaMetadataResponse::from)
                .orElseThrow(() -> new ConflictException(
                        "Evidência idempotente não está mais disponível."));
    }

    @Transactional(readOnly = true)
    public List<EvidenciaMetadataResponse> list(
            String requestedWorkspaceId,
            String requestedSubjectType,
            Long subjectId
    ) {
        String workspaceId = authorization.requireAuthorizedWorkspace(requestedWorkspaceId);
        if ((requestedSubjectType == null) != (subjectId == null)) {
            throw new IllegalArgumentException("subjectType e subjectId devem ser informados juntos.");
        }
        List<Evidencia> evidence;
        if (requestedSubjectType == null) {
            evidence = evidenciaRepository.findByWorkspaceIdOrderByRecordedAtDesc(workspaceId);
        } else {
            String subjectType = validateSubject(requestedSubjectType, subjectId, workspaceId);
            evidence = evidenciaRepository
                    .findByWorkspaceIdAndSubjectTypeAndSubjectIdOrderByRecordedAtDesc(
                            workspaceId, subjectType, subjectId);
        }
        return evidence.stream().map(EvidenciaMetadataResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public Evidencia requireAuthorized(Long id) {
        Evidencia evidence = evidenciaRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Evidência não encontrada: " + id));
        authorization.requireMember(evidence.getWorkspaceId());
        return evidence;
    }

    public Resource resource(Evidencia evidence) {
        return storage.resource(evidence);
    }

    private String validateSubject(String requestedType, Long subjectId, String workspaceId) {
        String type = normalizeSubject(requestedType, subjectId);
        references.requireLinkableEntity(type, String.valueOf(subjectId), workspaceId);
        return type;
    }

    private String normalizeSubject(String requestedType, Long subjectId) {
        if (requestedType == null || requestedType.isBlank()) {
            throw new IllegalArgumentException("subjectType é obrigatório.");
        }
        if (subjectId == null || subjectId < 1) {
            throw new IllegalArgumentException("subjectId é inválido.");
        }
        String type = requestedType.strip().toUpperCase(Locale.ROOT);
        if (!SUBJECT_TYPES.contains(type)) {
            throw new IllegalArgumentException("Evidências só podem apoiar observações, ações ou resultados.");
        }
        return type;
    }

    private Instant validateCapturedAt(Instant requested, Instant now) {
        Instant value = requested == null ? now : requested;
        if (value.isBefore(Instant.parse("2000-01-01T00:00:00Z"))
                || value.isAfter(now.plus(5, ChronoUnit.MINUTES))) {
            throw new IllegalArgumentException("capturedAt está fora do intervalo permitido.");
        }
        return value;
    }

    private String requiredText(String value, String field, int maxLength) {
        String normalized = optionalText(value, field, maxLength);
        if (normalized == null) {
            throw new IllegalArgumentException(field + " é obrigatório.");
        }
        return normalized;
    }

    private String optionalText(String value, String field, int maxLength) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.strip();
        if (normalized.length() > maxLength) {
            throw new IllegalArgumentException(field + " excede " + maxLength + " caracteres.");
        }
        return normalized;
    }

    private String optionalOfflineId(String value, String field) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.strip();
        if (!OFFLINE_ID.matcher(normalized).matches()) {
            throw new IllegalArgumentException(field + " é inválido.");
        }
        return normalized;
    }

    private void registerRollbackCleanup(EvidenciaStorageService.StoredEvidence stored) {
        if (stored == null) {
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status != STATUS_COMMITTED) {
                    storage.delete(stored);
                }
            }
        });
    }

    private record CanonicalEvidencePayload(
            String workspaceId,
            String subjectType,
            Long subjectId,
            String title,
            String description,
            String capturedAt,
            String deviceId,
            String clientMutationId,
            CanonicalFilePayload file
    ) {
    }

    private record CanonicalFilePayload(
            String originalFilename,
            String contentType,
            long sizeBytes,
            String sha256
    ) {
    }
}
