package com.angico.evidencias;

import com.angico.common.ClockProvider;
import com.angico.common.ConflictException;
import com.angico.core.ontology.OntologyService;
import com.angico.workspaces.WorkspaceAuthorizationService;
import com.angico.workspaces.WorkspaceReferenceValidator;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.core.io.Resource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

@Service
public class EvidenciaService {

    private static final Set<String> SUBJECT_TYPES = Set.of(
            OntologyService.OBSERVACAO, OntologyService.ACAO, OntologyService.RESULTADO);
    private static final Pattern OFFLINE_ID = Pattern.compile("[A-Za-z0-9._:-]{1,128}");

    private final EvidenciaRepository evidenciaRepository;
    private final EvidenciaStorageService storage;
    private final EvidenciaMemoryPublisher publisher;
    private final WorkspaceAuthorizationService authorization;
    private final WorkspaceReferenceValidator references;
    private final ClockProvider clock;

    public EvidenciaService(
            EvidenciaRepository evidenciaRepository,
            EvidenciaStorageService storage,
            EvidenciaMemoryPublisher publisher,
            WorkspaceAuthorizationService authorization,
            WorkspaceReferenceValidator references,
            ClockProvider clock
    ) {
        this.evidenciaRepository = evidenciaRepository;
        this.storage = storage;
        this.publisher = publisher;
        this.authorization = authorization;
        this.references = references;
        this.clock = clock;
    }

    @Transactional
    public EvidenciaMetadataResponse create(
            String requestedWorkspaceId,
            String requestedSubjectType,
            Long subjectId,
            String title,
            String description,
            Instant capturedAt,
            String deviceId,
            String clientMutationId,
            MultipartFile file
    ) {
        String workspaceId = authorization.requireAuthorizedWorkspace(requestedWorkspaceId);
        String subjectType = validateSubject(requestedSubjectType, subjectId, workspaceId);
        String actorId = authorization.currentActorId();
        Instant now = clock.now();
        Instant captureTime = validateCapturedAt(capturedAt, now);
        String safeDeviceId = optionalOfflineId(deviceId, "deviceId");
        String safeMutationId = optionalOfflineId(clientMutationId, "clientMutationId");

        EvidenciaStorageService.StoredEvidence stored = file == null ? null : storage.store(file);
        registerRollbackCleanup(stored);

        Evidencia evidence = new Evidencia(
                workspaceId,
                subjectType,
                subjectId,
                requiredText(title, "title", 200),
                optionalText(description, "description", 2000),
                captureTime,
                now,
                actorId,
                safeDeviceId,
                safeMutationId
        );
        if (stored != null) {
            evidence.attach(stored);
        }
        try {
            evidence = evidenciaRepository.saveAndFlush(evidence);
        } catch (DataIntegrityViolationException exception) {
            throw new ConflictException("clientMutationId já foi usado neste workspace.");
        }
        publisher.publish(evidence);
        return EvidenciaMetadataResponse.from(evidence);
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
        references.requireLinkableEntity(type, String.valueOf(subjectId), workspaceId);
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
}
