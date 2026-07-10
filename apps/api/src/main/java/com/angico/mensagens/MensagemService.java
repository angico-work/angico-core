package com.angico.mensagens;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.text.Normalizer;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.HexFormat;
import java.util.stream.Collectors;

import com.angico.common.ClockProvider;
import com.angico.common.ConflictException;
import com.angico.common.ForbiddenException;
import com.angico.common.idempotency.IdempotencyOperation;
import com.angico.common.idempotency.IdempotencyRecord;
import com.angico.common.idempotency.IdempotencyService;
import com.angico.core.memory.MemoryEvent;
import com.angico.core.memory.MemoryRelationMetadata;
import com.angico.core.memory.MemoryRelationRepository;
import com.angico.core.memory.MemorySyncStatus;
import com.angico.core.memory.OperationalMemoryService;
import com.angico.core.ontology.OntologyService;
import com.angico.pessoas.AngicoIdNormalizer;
import com.angico.pessoas.Pessoa;
import com.angico.pessoas.PessoaRepository;
import com.angico.territorios.Territorio;
import com.angico.territorios.TerritorioRepository;
import com.angico.territorios.TerritorioService;
import com.angico.workspaces.WorkspaceAuthorizationService;
import com.angico.workspaces.WorkspaceMemberRepository;
import com.angico.workspaces.WorkspaceReferenceValidator;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.PathResource;
import org.springframework.core.io.Resource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class MensagemService {

    private static final Set<String> LINKABLE_TYPES = Set.of(
            OntologyService.TERRITORIO,
            OntologyService.OBSERVACAO,
            OntologyService.PROBLEMA,
            OntologyService.POTENCIALIDADE,
            OntologyService.MISSAO,
            OntologyService.ACAO,
            OntologyService.RESULTADO,
            OntologyService.INDICADOR
    );
    private static final Set<String> ADMIN_ROLES = Set.of("OWNER", "ADMIN");

    private final ConversaRepository conversaRepository;
    private final MensagemRepository mensagemRepository;
    private final MensagemAnexoRepository anexoRepository;
    private final MessageReadReceiptRepository readReceiptRepository;
    private final PessoaRepository pessoaRepository;
    private final TerritorioRepository territorioRepository;
    private final WorkspaceAuthorizationService authorizationService;
    private final MemoryRelationRepository relationRepository;
    private final WorkspaceMemberRepository memberRepository;
    private final OperationalMemoryService memoryService;
    private final OntologyService ontologyService;
    private final WorkspaceReferenceValidator referenceValidator;
    private final IdempotencyService idempotencyService;
    private final ClockProvider clock;
    private final TransactionTemplate transactions;
    private final Path uploadRoot;
    private final long maxBytes;
    private final Set<String> allowedContentTypes;

    public MensagemService(
            ConversaRepository conversaRepository,
            MensagemRepository mensagemRepository,
            MensagemAnexoRepository anexoRepository,
            MessageReadReceiptRepository readReceiptRepository,
            PessoaRepository pessoaRepository,
            TerritorioRepository territorioRepository,
            WorkspaceAuthorizationService authorizationService,
            MemoryRelationRepository relationRepository,
            WorkspaceMemberRepository memberRepository,
            OperationalMemoryService memoryService,
            OntologyService ontologyService,
            WorkspaceReferenceValidator referenceValidator,
            IdempotencyService idempotencyService,
            ClockProvider clock,
            PlatformTransactionManager transactionManager,
            @Value("${angico.uploads.dir:uploads}") String uploadDir,
            @Value("${angico.uploads.max-bytes:2097152}") long maxBytes,
            @Value("${angico.uploads.allowed-content-types}") String allowedContentTypes
    ) {
        this.conversaRepository = conversaRepository;
        this.mensagemRepository = mensagemRepository;
        this.anexoRepository = anexoRepository;
        this.readReceiptRepository = readReceiptRepository;
        this.pessoaRepository = pessoaRepository;
        this.territorioRepository = territorioRepository;
        this.authorizationService = authorizationService;
        this.relationRepository = relationRepository;
        this.memberRepository = memberRepository;
        this.memoryService = memoryService;
        this.ontologyService = ontologyService;
        this.referenceValidator = referenceValidator;
        this.idempotencyService = idempotencyService;
        this.clock = clock;
        this.transactions = new TransactionTemplate(transactionManager);
        this.uploadRoot = Path.of(uploadDir).toAbsolutePath().normalize();
        this.maxBytes = maxBytes;
        this.allowedContentTypes = Arrays.stream(allowedContentTypes.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .collect(Collectors.toUnmodifiableSet());
    }

    public List<ConversaResponse> list(String workspaceId) {
        String allowedWorkspace = authorizationService.requireAuthorizedWorkspace(workspaceId);
        return conversaRepository.findByWorkspaceIdOrderByUpdatedAtDesc(allowedWorkspace)
                .stream()
                .filter(this::canAccessConversation)
                .map(conversa -> toResponse(conversa, List.of()))
                .toList();
    }

    public ConversaResponse get(Long conversaId) {
        Conversa conversa = requireConversa(conversaId);
        requireConversationAccess(conversa);
        return toResponse(conversa, messages(conversa.getId()));
    }

    public List<MensagemResponse> messages(Long conversaId) {
        Conversa conversa = requireConversa(conversaId);
        requireConversationAccess(conversa);
        List<Mensagem> mensagens = mensagemRepository.findTimeline(conversaId);
        return toMessageResponses(mensagens);
    }

    public List<MensagemResponse> recent(String workspaceId) {
        String allowedWorkspace = authorizationService.requireAuthorizedWorkspace(workspaceId);
        List<Mensagem> visible = mensagemRepository.findTop8ByWorkspaceIdOrderByCreatedAtDesc(allowedWorkspace)
                .stream()
                .filter(message -> conversaRepository.findById(message.getConversaId())
                        .map(this::canAccessConversation)
                        .orElse(false))
                .toList();
        return toMessageResponses(visible);
    }

    public List<MensagemBuscaResponse> search(String workspaceId, String rawQuery) {
        String allowedWorkspace = authorizationService.requireAuthorizedWorkspace(workspaceId);
        String query = normalizeSearchQuery(rawQuery);
        List<MensagemBuscaResponse> results = new ArrayList<>();
        for (Conversa conversa : conversaRepository.findByWorkspaceIdOrderByUpdatedAtDesc(allowedWorkspace)) {
            if (!canAccessConversation(conversa)) {
                continue;
            }
            boolean conversationMatch = searchable(conversa.getTitulo(), conversa.getContextEntityType(),
                    conversa.getContextEntityId()).contains(query);
            List<Mensagem> messages = mensagemRepository.findTimeline(conversa.getId());
            for (Mensagem message : messages) {
                if (searchable(message.getCorpo(), message.getSenderNome(), message.getLinkedEntityType(),
                        message.getLinkedEntityId()).contains(query)) {
                    results.add(toSearchResponse(conversa, message));
                    if (results.size() == 50) {
                        return List.copyOf(results);
                    }
                }
            }
            if (conversationMatch && messages.stream().noneMatch(message -> results.stream()
                    .anyMatch(result -> Objects.equals(result.mensagemId(), message.getId())))) {
                results.add(toSearchResponse(conversa, null));
                if (results.size() == 50) {
                    return List.copyOf(results);
                }
            }
        }
        return List.copyOf(results);
    }

    @Transactional
    public void markRead(Long conversaId) {
        Conversa conversa = requireConversa(conversaId);
        requireConversationAccess(conversa);
        Pessoa actor = currentPessoa();
        mensagemRepository.findTopByConversaIdOrderByRecordedAtDescIdDesc(conversaId)
                .ifPresent(message -> {
                    Instant now = clock.now();
                    Instant recordedAt = message.getRecordedAt();
                    MessageReadReceipt receipt = readReceiptRepository
                            .findByWorkspaceIdAndConversaIdAndPessoaId(
                                    conversa.getWorkspaceId(), conversaId, actor.getId())
                            .orElseGet(() -> new MessageReadReceipt(
                                    conversa.getWorkspaceId(),
                                    conversaId,
                                    actor.getId(),
                                    message.getId(),
                                    recordedAt,
                                    now
                            ));
                    receipt.advance(message.getId(), recordedAt, now);
                    readReceiptRepository.save(receipt);
                });
    }

    @Transactional
    public ConversaResponse create(ConversaRequest request) {
        Pessoa actor = currentPessoa();
        String workspaceId = authorizationService.requireAuthorizedWorkspace(request.workspaceId());
        ContextReference context = resolveContext(request, workspaceId);
        Territorio territorio = request.territorioId() == null
                ? null
                : referenceValidator.requireTerritorio(request.territorioId(), workspaceId);
        if (territorio == null && OntologyService.TERRITORIO.equals(context.type())) {
            territorio = referenceValidator.requireTerritorio(context.id(), workspaceId);
        }

        Instant now = clock.now();
        Conversa conversa = new Conversa();
        conversa.setWorkspaceId(workspaceId);
        conversa.setTerritorioId(territorio == null ? null : territorio.getId());
        conversa.setContextEntityType(context.type());
        conversa.setContextEntityId(context.id());
        conversa.setTitulo(TerritorioService.requireText(request.titulo(), "titulo"));
        conversa.setCreatedByPessoaId(actor.getId());
        conversa.setStatus("ATIVA");
        conversa.setCreatedAt(now);
        conversa.setUpdatedAt(now);
        conversa = conversaRepository.save(conversa);

        String conversaId = String.valueOf(conversa.getId());
        memoryService.registrarObjeto(workspaceId, OntologyService.CONVERSA, conversaId, null, conversa.getTitulo(), "ATIVA", "api");
        if (territorio != null) {
            memoryService.registrarRelacaoAtiva(
                    workspaceId,
                    OntologyService.CONVERSA,
                    conversaId,
                    OntologyService.TERRITORIO,
                    String.valueOf(territorio.getId()),
                    "PERTENCE_A",
                    relationMetadata(actor, "Conversa territorial")
            );
        }
        if (territorio == null
                || !context.type().equals(OntologyService.TERRITORIO)
                || !context.id().equals(String.valueOf(territorio.getId()))) {
            memoryService.registrarRelacaoAtiva(
                    workspaceId,
                    OntologyService.CONVERSA,
                    conversaId,
                    context.type(),
                    context.id(),
                    "REFERE_SE_A",
                    relationMetadata(actor, "Contexto da conversa")
            );
        }
        registerParticipant(workspaceId, conversaId, actor, actor);
        Set<Long> resolvedParticipantIds = new LinkedHashSet<>();
        if (request.participanteIds() != null) {
            resolvedParticipantIds.addAll(request.participanteIds());
        }
        if (request.participanteRefs() != null) {
            request.participanteRefs().stream()
                    .flatMap(ref -> Arrays.stream(ref.split("[,;\\s]+")))
                    .map(String::trim)
                    .filter(ref -> !ref.isBlank())
                    .map(ref -> resolveParticipant(ref).getId())
                    .forEach(resolvedParticipantIds::add);
        }
        resolvedParticipantIds.stream()
                .filter(id -> !id.equals(actor.getId()))
                .map(id -> pessoaRepository.findById(id)
                        .orElseThrow(() -> new IllegalArgumentException("Pessoa nao encontrada: " + id)))
                .forEach(pessoa -> registerParticipant(workspaceId, conversaId, pessoa, actor));
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("titulo", conversa.getTitulo());
        payload.put("contextEntityType", context.type());
        payload.put("contextEntityId", context.id());
        if (territorio != null) {
            payload.put("territorioId", territorio.getId());
        }
        memoryService.registrarEvento(new MemoryEvent(
                workspaceId,
                OntologyService.CONVERSA,
                conversaId,
                "CONVERSA_CRIADA",
                "api",
                actor.getAngicoId(),
                null,
                null,
                null,
                1,
                now,
                payload
        ));

        return toResponse(conversa, List.of());
    }

    public MensagemResponse send(
            Long conversaId,
            String corpo,
            Double latitude,
            Double longitude,
            String localDescricao,
            String linkedEntityType,
            String linkedEntityId,
            String rawClientMessageId,
            String rawDeviceId,
            Instant requestedOccurredAt,
            String rawIdempotencyKey,
            List<MultipartFile> attachments
    ) {
        Pessoa actor = currentPessoa();
        Conversa conversa = requireConversa(conversaId);
        requireConversationAccess(conversa);
        validateMessage(corpo, latitude, longitude, attachments);
        String normalizedLinkedType = normalizeLinkedType(linkedEntityType, linkedEntityId);
        if (normalizedLinkedType != null) {
            referenceValidator.requireLinkableEntity(
                    normalizedLinkedType, linkedEntityId, conversa.getWorkspaceId());
        }
        String clientMessageId = idempotencyService.normalizeKey(rawClientMessageId);
        String headerKey = idempotencyService.normalizeKey(rawIdempotencyKey);
        if (clientMessageId != null && headerKey != null && !clientMessageId.equals(headerKey)) {
            throw new IllegalArgumentException("clientMessageId deve coincidir com Idempotency-Key.");
        }
        String idempotencyKey = headerKey == null ? clientMessageId : headerKey;
        if (clientMessageId == null) {
            clientMessageId = idempotencyKey;
        }
        String deviceId = normalizeDeviceId(rawDeviceId);
        List<AttachmentFingerprint> attachmentFingerprints = fingerprintAttachments(attachments);
        MessagePayload payload = new MessagePayload(
                conversaId,
                corpo == null ? "" : corpo.trim(),
                latitude,
                longitude,
                normalizeOptional(localDescricao),
                normalizedLinkedType,
                normalizeOptional(linkedEntityId),
                clientMessageId,
                deviceId,
                requestedOccurredAt == null ? null : requestedOccurredAt.toString(),
                attachmentFingerprints
        );
        String requestHash = idempotencyKey == null
                ? null
                : idempotencyService.canonicalPayloadHash(payload);
        String finalClientMessageId = clientMessageId;
        try {
            return Objects.requireNonNull(transactions.execute(status -> sendInTransaction(
                    conversaId,
                    payload,
                    attachments,
                    actor,
                    finalClientMessageId,
                    idempotencyKey,
                    requestHash
            )));
        } catch (DataIntegrityViolationException exception) {
            return recoverMessageReplay(
                    conversaId,
                    conversa.getWorkspaceId(),
                    actor,
                    idempotencyKey,
                    requestHash,
                    exception
            );
        }
    }

    private MensagemResponse sendInTransaction(
            Long conversaId,
            MessagePayload payload,
            List<MultipartFile> attachments,
            Pessoa actor,
            String clientMessageId,
            String idempotencyKey,
            String requestHash
    ) {
        Conversa conversa = requireConversa(conversaId);
        requireConversationAccess(conversa);
        if (idempotencyKey != null) {
            var existing = idempotencyService.find(
                    conversa.getWorkspaceId(),
                    actor.getAngicoId(),
                    IdempotencyOperation.MENSAGEM_SEND,
                    idempotencyKey
            );
            if (existing.isPresent()) {
                return replayMessage(existing.get(), conversa, requestHash);
            }
        }
        if (clientMessageId != null && mensagemRepository
                .findByWorkspaceIdAndSenderPessoaIdAndClientMessageId(
                        conversa.getWorkspaceId(), actor.getId(), clientMessageId)
                .isPresent()) {
            throw new ConflictException("clientMessageId já foi usado nesta conversa.");
        }
        IdempotencyRecord reservation = idempotencyKey == null
                ? null
                : idempotencyService.reserve(
                        conversa.getWorkspaceId(),
                        actor.getAngicoId(),
                        IdempotencyOperation.MENSAGEM_SEND,
                        idempotencyKey,
                        requestHash
                );
        Instant recordedAt = clock.now();
        Mensagem mensagem = new Mensagem();
        mensagem.setWorkspaceId(conversa.getWorkspaceId());
        mensagem.setConversaId(conversa.getId());
        mensagem.setSenderPessoaId(actor.getId());
        mensagem.setSenderNome(actor.getNome());
        mensagem.setCorpo(payload.corpo());
        mensagem.setLatitude(payload.latitude());
        mensagem.setLongitude(payload.longitude());
        mensagem.setLocalDescricao(payload.localDescricao());
        mensagem.setLinkedEntityType(payload.linkedEntityType());
        mensagem.setLinkedEntityId(payload.linkedEntityId());
        mensagem.setClientMessageId(clientMessageId);
        mensagem.setDeviceId(payload.deviceId());
        mensagem.setStatus("ENVIADA");
        mensagem.setOccurredAt(payload.occurredAt() == null
                ? recordedAt
                : Instant.parse(payload.occurredAt()));
        mensagem.setRecordedAt(recordedAt);
        mensagem.setCreatedAt(recordedAt);
        mensagem = mensagemRepository.save(mensagem);

        List<MensagemAnexo> anexos = saveAttachments(conversa.getWorkspaceId(), mensagem, attachments);
        conversa.setUpdatedAt(recordedAt);
        conversaRepository.save(conversa);
        registerMessageMemory(conversa, mensagem, anexos, actor, idempotencyKey);
        if (reservation != null) {
            reservation.complete(
                    OntologyService.MENSAGEM,
                    String.valueOf(mensagem.getId()),
                    200,
                    "application/json",
                    clock.now()
            );
        }
        return toMessageResponse(mensagem, anexos);
    }

    private MensagemResponse recoverMessageReplay(
            Long conversaId,
            String workspaceId,
            Pessoa actor,
            String idempotencyKey,
            String requestHash,
            DataIntegrityViolationException original
    ) {
        return Objects.requireNonNull(transactions.execute(status -> {
            Conversa conversa = requireConversa(conversaId);
            requireConversationAccess(conversa);
            if (idempotencyKey != null) {
                var existing = idempotencyService.find(
                        workspaceId,
                        actor.getAngicoId(),
                        IdempotencyOperation.MENSAGEM_SEND,
                        idempotencyKey
                );
                if (existing.isPresent()) {
                    return replayMessage(existing.get(), conversa, requestHash);
                }
            }
            throw original;
        }));
    }

    private MensagemResponse replayMessage(
            IdempotencyRecord record,
            Conversa conversa,
            String requestHash
    ) {
        idempotencyService.validateReplay(record, requestHash);
        if (!OntologyService.MENSAGEM.equals(record.getResourceType())) {
            throw new ConflictException("Resultado idempotente incompatível com mensagem.");
        }
        long messageId;
        try {
            messageId = Long.parseLong(record.getResourceId());
        } catch (NumberFormatException exception) {
            throw new ConflictException("Resultado idempotente inválido.");
        }
        Mensagem mensagem = mensagemRepository.findById(messageId)
                .filter(candidate -> candidate.getWorkspaceId().equals(conversa.getWorkspaceId()))
                .filter(candidate -> candidate.getConversaId().equals(conversa.getId()))
                .orElseThrow(() -> new ConflictException("Mensagem idempotente não está mais disponível."));
        return toMessageResponse(
                mensagem,
                anexoRepository.findByMensagemIdOrderByCreatedAtAsc(mensagem.getId())
        );
    }

    public MensagemAnexo requireAttachment(Long anexoId) {
        MensagemAnexo anexo = anexoRepository.findById(anexoId)
                .orElseThrow(() -> new IllegalArgumentException("Anexo nao encontrado: " + anexoId));
        authorizationService.requireMember(anexo.getWorkspaceId());
        Mensagem mensagem = mensagemRepository.findById(anexo.getMensagemId())
                .orElseThrow(() -> new IllegalArgumentException("Mensagem do anexo nao encontrada."));
        Conversa conversa = requireConversa(mensagem.getConversaId());
        if (!anexo.getWorkspaceId().equals(mensagem.getWorkspaceId())
                || !anexo.getWorkspaceId().equals(conversa.getWorkspaceId())) {
            throw new ForbiddenException("Anexo fora da conversa autorizada.");
        }
        requireConversationAccess(conversa);
        return anexo;
    }

    public Resource attachmentResource(MensagemAnexo anexo) {
        Path path = Path.of(anexo.getStoragePath()).toAbsolutePath().normalize();
        try {
            Path realRoot = uploadRoot.toRealPath();
            Path realPath = path.toRealPath();
            if (!realPath.startsWith(realRoot)
                    || Files.isSymbolicLink(path)
                    || !Files.isRegularFile(path, LinkOption.NOFOLLOW_LINKS)) {
                throw new IllegalArgumentException("Arquivo nao encontrado.");
            }
            return new PathResource(realPath);
        } catch (IOException exception) {
            throw new IllegalArgumentException("Arquivo nao encontrado.");
        }
    }

    private Conversa requireConversa(Long id) {
        return conversaRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Conversa nao encontrada: " + id));
    }

    private Pessoa currentPessoa() {
        return authorizationService.currentPessoa();
    }

    private void requireConversationAccess(Conversa conversa) {
        authorizationService.requireMember(conversa.getWorkspaceId());
        if (!canAccessConversation(conversa)) {
            throw new ForbiddenException("Apenas participantes podem acessar esta conversa.");
        }
    }

    private boolean canAccessConversation(Conversa conversa) {
        if (authorizationService.hasRole(conversa.getWorkspaceId(), ADMIN_ROLES)) {
            return true;
        }
        Pessoa actor = currentPessoa();
        return relationRepository
                .existsByWorkspaceIdAndOriginTypeAndOriginIdAndDestinationTypeAndDestinationIdAndRelationTypeAndActiveTrue(
                        conversa.getWorkspaceId(),
                        OntologyService.CONVERSA,
                        String.valueOf(conversa.getId()),
                        OntologyService.PESSOA,
                        String.valueOf(actor.getId()),
                        "TEM_PARTICIPANTE"
                );
    }

    private Pessoa resolveParticipant(String rawReference) {
        String reference = rawReference.trim();
        if (reference.startsWith("@")) {
            String angicoId = AngicoIdNormalizer.normalize(reference);
            return pessoaRepository.findByAngicoIdIgnoreCase(angicoId)
                    .orElseThrow(() -> new IllegalArgumentException("Angico ID nao encontrado: @" + angicoId));
        }
        if (reference.contains("@")) {
            String email = reference.toLowerCase(Locale.ROOT);
            return pessoaRepository.findByEmailIgnoreCase(email)
                    .orElseThrow(() -> new IllegalArgumentException("Email nao encontrado: " + email));
        }
        String angicoId = AngicoIdNormalizer.normalize(reference);
        return pessoaRepository.findByAngicoIdIgnoreCase(angicoId)
                .orElseThrow(() -> new IllegalArgumentException("Angico ID nao encontrado: @" + angicoId));
    }

    private void registerParticipant(
            String workspaceId,
            String conversaId,
            Pessoa pessoa,
            Pessoa actor
    ) {
        if (pessoa.getAngicoId() == null || memberRepository
                .findByWorkspaceIdAndActorId(workspaceId, pessoa.getAngicoId())
                .filter(member -> "ACTIVE".equalsIgnoreCase(member.getStatus()))
                .isEmpty()) {
            throw new IllegalArgumentException("Participante fora do workspace da conversa.");
        }
        memoryService.registrarObjeto(
                workspaceId,
                OntologyService.PESSOA,
                String.valueOf(pessoa.getId()),
                null,
                pessoa.getNome(),
                pessoa.getStatus(),
                "api"
        );
        memoryService.registrarRelacaoAtiva(
                workspaceId,
                OntologyService.CONVERSA,
                conversaId,
                OntologyService.PESSOA,
                String.valueOf(pessoa.getId()),
                "TEM_PARTICIPANTE",
                relationMetadata(actor, "Participante da conversa")
        );
    }

    private void validateMessage(
            String corpo,
            Double latitude,
            Double longitude,
            List<MultipartFile> attachments
    ) {
        boolean hasText = corpo != null && !corpo.isBlank();
        boolean hasLocation = latitude != null && longitude != null;
        boolean hasAttachment = attachments != null && attachments.stream().anyMatch(file -> file != null && !file.isEmpty());
        if (!hasText && !hasLocation && !hasAttachment) {
            throw new IllegalArgumentException("Mensagem precisa ter texto, localizacao ou anexo.");
        }
        if ((latitude == null) != (longitude == null)) {
            throw new IllegalArgumentException("Latitude e longitude devem ser enviadas juntas.");
        }
        if (latitude != null && (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180)) {
            throw new IllegalArgumentException("Coordenadas invalidas.");
        }
    }

    private String normalizeLinkedType(String linkedEntityType, String linkedEntityId) {
        if (linkedEntityId == null || linkedEntityId.isBlank()) {
            return null;
        }
        String type = linkedEntityType == null ? "" : linkedEntityType.trim().toUpperCase(Locale.ROOT);
        ontologyService.requireObjectType(type);
        if (!LINKABLE_TYPES.contains(type)) {
            throw new IllegalArgumentException("Tipo nao pode ser mencionado em mensagem: " + type);
        }
        ontologyService.requireValidRelation(OntologyService.MENSAGEM, "MENCIONA", type);
        return type;
    }

    private List<MensagemAnexo> saveAttachments(
            String workspaceId,
            Mensagem mensagem,
            List<MultipartFile> attachments
    ) {
        if (attachments == null) {
            return List.of();
        }
        List<MensagemAnexo> saved = new ArrayList<>();
        attachments.stream()
                .filter(file -> file != null && !file.isEmpty())
                .forEach(file -> saved.add(saveAttachment(workspaceId, mensagem, file)));
        return saved;
    }

    private MensagemAnexo saveAttachment(String workspaceId, Mensagem mensagem, MultipartFile file) {
        String contentType = file.getContentType() == null ? "application/octet-stream" : file.getContentType();
        if (!allowedContentTypes.contains(contentType)) {
            throw new IllegalArgumentException("Tipo de anexo nao permitido: " + contentType);
        }
        if (file.getSize() > maxBytes) {
            throw new IllegalArgumentException("Anexo excede o limite de " + maxBytes + " bytes.");
        }
        String originalName = sanitizeFilename(file.getOriginalFilename());
        String storedName = UUID.randomUUID() + "_" + originalName;
        Path folder = uploadRoot.resolve(workspaceId).resolve("mensagens").normalize();
        if (!folder.startsWith(uploadRoot)) {
            throw new IllegalArgumentException("Nome de arquivo invalido.");
        }
        Path destination;
        try {
            Files.createDirectories(uploadRoot);
            Files.createDirectories(folder);
            Path realRoot = uploadRoot.toRealPath();
            Path realFolder = folder.toRealPath();
            if (!realFolder.startsWith(realRoot)) {
                throw new IllegalArgumentException("Caminho de anexo inválido.");
            }
            destination = realFolder.resolve(storedName).normalize();
            byte[] bytes = file.getBytes();
            if (bytes.length == 0 || bytes.length > maxBytes) {
                throw new IllegalArgumentException("Tamanho de anexo inválido.");
            }
            Files.write(destination, bytes, StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE);
        } catch (IOException ex) {
            throw new IllegalStateException("Falha ao gravar anexo.", ex);
        }
        registerRollbackCleanup(destination);

        MensagemAnexo anexo = new MensagemAnexo();
        anexo.setWorkspaceId(workspaceId);
        anexo.setMensagemId(mensagem.getId());
        anexo.setOriginalFilename(originalName);
        anexo.setContentType(contentType);
        anexo.setSizeBytes(file.getSize());
        anexo.setStoragePath(destination.toString());
        anexo.setAttachmentType(contentType.startsWith("image/") ? "IMAGEM" : "ARQUIVO");
        anexo.setCreatedAt(clock.now());
        return anexoRepository.save(anexo);
    }

    private String sanitizeFilename(String value) {
        String filename = value == null || value.isBlank() ? "anexo" : Path.of(value).getFileName().toString();
        String sanitized = filename.replaceAll("[^A-Za-z0-9._-]", "_");
        if (sanitized.length() > 180) {
            sanitized = sanitized.substring(sanitized.length() - 180);
        }
        return sanitized;
    }

    private void registerRollbackCleanup(Path path) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status != TransactionSynchronization.STATUS_COMMITTED) {
                    try {
                        Files.deleteIfExists(path);
                    } catch (IOException ignored) {
                    }
                }
            }
        });
    }

    private void registerMessageMemory(
            Conversa conversa,
            Mensagem mensagem,
            List<MensagemAnexo> anexos,
            Pessoa actor,
            String idempotencyKey
    ) {
        String workspaceId = conversa.getWorkspaceId();
        String mensagemId = String.valueOf(mensagem.getId());
        memoryService.registrarObjeto(
                workspaceId,
                OntologyService.MENSAGEM,
                mensagemId,
                null,
                mensagem.getCorpo().isBlank() ? "Mensagem " + mensagemId : mensagem.getCorpo(),
                "ENVIADA",
                "api"
        );
        memoryService.registrarRelacaoAtiva(workspaceId, OntologyService.MENSAGEM, mensagemId, OntologyService.CONVERSA,
                String.valueOf(conversa.getId()), "ENVIADA_EM", relationMetadata(actor, "Mensagem interna"));
        memoryService.registrarRelacaoAtiva(workspaceId, OntologyService.MENSAGEM, mensagemId, OntologyService.PESSOA,
                String.valueOf(actor.getId()), "ENVIADA_POR", relationMetadata(actor, "Autor autenticado"));

        anexos.forEach(anexo -> {
            String anexoId = String.valueOf(anexo.getId());
            memoryService.registrarObjeto(workspaceId, OntologyService.ANEXO, anexoId, null,
                    anexo.getOriginalFilename(), anexo.getAttachmentType(), "api");
            memoryService.registrarRelacaoAtiva(workspaceId, OntologyService.MENSAGEM, mensagemId, OntologyService.ANEXO,
                    anexoId, "ANEXA", relationMetadata(actor, anexo.getContentType()));
        });

        if (mensagem.getLatitude() != null && mensagem.getLongitude() != null) {
            String localizacaoId = "mensagem-" + mensagemId + "-localizacao";
            memoryService.registrarObjeto(
                    workspaceId,
                    OntologyService.LOCALIZACAO,
                    localizacaoId,
                    null,
                    mensagem.getLocalDescricao() == null || mensagem.getLocalDescricao().isBlank()
                            ? "Localizacao compartilhada"
                            : mensagem.getLocalDescricao(),
                    "COMPARTILHADA",
                    "api"
            );
            memoryService.registrarRelacaoAtiva(workspaceId, OntologyService.MENSAGEM, mensagemId, OntologyService.LOCALIZACAO,
                    localizacaoId, "COMPARTILHA", relationMetadata(actor, "Localizacao compartilhada"));
            if (conversa.getTerritorioId() != null) {
                memoryService.registrarRelacaoAtiva(
                        workspaceId,
                        OntologyService.LOCALIZACAO,
                        localizacaoId,
                        OntologyService.TERRITORIO,
                        String.valueOf(conversa.getTerritorioId()),
                        "REFERE_SE_A",
                        relationMetadata(actor, "Localizacao em conversa territorial")
                );
            }
        }

        if (mensagem.getLinkedEntityType() != null && mensagem.getLinkedEntityId() != null) {
            memoryService.registrarRelacaoAtiva(
                    workspaceId,
                    OntologyService.MENSAGEM,
                    mensagemId,
                    mensagem.getLinkedEntityType(),
                    mensagem.getLinkedEntityId(),
                    "MENCIONA",
                    relationMetadata(actor, "Referencia enviada na conversa")
            );
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("conversaId", conversa.getId());
        payload.put("senderPessoaId", actor.getId());
        payload.put("hasLocation", mensagem.getLatitude() != null && mensagem.getLongitude() != null);
        payload.put("attachments", anexos.size());
        MemorySyncStatus syncStatus = mensagem.getDeviceId() == null && idempotencyKey == null
                ? MemorySyncStatus.SERVER_RECORDED
                : MemorySyncStatus.SYNCED_FROM_OFFLINE;
        memoryService.registrarEvento(new MemoryEvent(
                workspaceId,
                OntologyService.MENSAGEM,
                mensagemId,
                "MENSAGEM_ENVIADA",
                "api",
                actor.getAngicoId(),
                mensagem.getDeviceId(),
                null,
                null,
                1,
                mensagem.getOccurredAt(),
                payload,
                idempotencyKey,
                syncStatus
        ));
    }

    private MemoryRelationMetadata relationMetadata(Pessoa actor, String context) {
        return new MemoryRelationMetadata(
                "api",
                context,
                actor.getAngicoId(),
                null
        );
    }

    private ContextReference resolveContext(ConversaRequest request, String workspaceId) {
        String type = normalizeOptional(request.contextEntityType());
        String id = normalizeOptional(request.contextEntityId());
        if (type == null && id == null && request.territorioId() != null) {
            type = OntologyService.TERRITORIO;
            id = String.valueOf(request.territorioId());
        }
        if (type == null || id == null) {
            throw new IllegalArgumentException("Contexto da conversa é obrigatório.");
        }
        type = ontologyService.canonicalObjectType(type);
        if (!LINKABLE_TYPES.contains(type)) {
            throw new IllegalArgumentException("Tipo não pode contextualizar conversa: " + type);
        }
        referenceValidator.requireLinkableEntity(type, id, workspaceId);
        if (!OntologyService.TERRITORIO.equals(type)) {
            ontologyService.requireValidRelation(OntologyService.CONVERSA, "REFERE_SE_A", type);
        }
        return new ContextReference(type, id);
    }

    private String normalizeDeviceId(String value) {
        String normalized = normalizeOptional(value);
        if (normalized != null && !normalized.matches("[A-Za-z0-9][A-Za-z0-9._:-]{0,127}")) {
            throw new IllegalArgumentException("deviceId inválido.");
        }
        return normalized;
    }

    private String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }

    private List<AttachmentFingerprint> fingerprintAttachments(List<MultipartFile> attachments) {
        if (attachments == null) {
            return List.of();
        }
        List<AttachmentFingerprint> fingerprints = new ArrayList<>();
        for (MultipartFile file : attachments) {
            if (file == null || file.isEmpty()) {
                continue;
            }
            String contentType = file.getContentType() == null
                    ? "application/octet-stream"
                    : file.getContentType();
            if (!allowedContentTypes.contains(contentType) || file.getSize() > maxBytes) {
                throw new IllegalArgumentException("Anexo não permitido.");
            }
            fingerprints.add(new AttachmentFingerprint(
                    sanitizeFilename(file.getOriginalFilename()),
                    contentType,
                    file.getSize(),
                    sha256(file)
            ));
        }
        return List.copyOf(fingerprints);
    }

    private String sha256(MultipartFile file) {
        try (InputStream input = file.getInputStream()) {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] buffer = new byte[8192];
            int read;
            while ((read = input.read(buffer)) >= 0) {
                if (read > 0) {
                    digest.update(buffer, 0, read);
                }
            }
            return HexFormat.of().formatHex(digest.digest());
        } catch (IOException | NoSuchAlgorithmException exception) {
            throw new IllegalArgumentException("Não foi possível identificar o anexo.", exception);
        }
    }

    private String normalizeSearchQuery(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Busca é obrigatória.");
        }
        String stripped = value.strip();
        if (stripped.length() < 2 || stripped.length() > 100) {
            throw new IllegalArgumentException("Busca deve ter entre 2 e 100 caracteres.");
        }
        return normalizeSearchText(stripped);
    }

    private String searchable(String... values) {
        return Arrays.stream(values)
                .filter(Objects::nonNull)
                .map(this::normalizeSearchText)
                .collect(Collectors.joining(" "));
    }

    private String normalizeSearchText(String value) {
        return Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT);
    }

    private MensagemBuscaResponse toSearchResponse(Conversa conversa, Mensagem message) {
        return new MensagemBuscaResponse(
                conversa.getId(),
                conversa.getTitulo(),
                conversa.getContextEntityType(),
                conversa.getContextEntityId(),
                message == null ? null : message.getId(),
                message == null ? null : message.getCorpo(),
                message == null ? null : message.getSenderNome(),
                message == null ? null : message.getOccurredAt()
        );
    }

    private long unreadCount(Conversa conversa) {
        Pessoa actor = currentPessoa();
        return readReceiptRepository
                .findByWorkspaceIdAndConversaIdAndPessoaId(
                        conversa.getWorkspaceId(), conversa.getId(), actor.getId())
                .map(receipt -> mensagemRepository.countUnreadAfter(
                        conversa.getId(),
                        actor.getId(),
                        receipt.getReadThrough(),
                        receipt.getLastReadMessageId()
                ))
                .orElseGet(() -> mensagemRepository.countByConversaIdAndSenderPessoaIdNot(
                        conversa.getId(), actor.getId()));
    }

    private List<MensagemResponse> toMessageResponses(List<Mensagem> mensagens) {
        if (mensagens.isEmpty()) {
            return List.of();
        }
        List<Long> ids = mensagens.stream().map(Mensagem::getId).toList();
        Map<Long, List<MensagemAnexo>> anexos = anexoRepository.findByMensagemIdInOrderByCreatedAtAsc(ids)
                .stream()
                .collect(Collectors.groupingBy(MensagemAnexo::getMensagemId));
        return mensagens.stream()
                .map(mensagem -> toMessageResponse(mensagem, anexos.getOrDefault(mensagem.getId(), List.of())))
                .toList();
    }

    private ConversaResponse toResponse(Conversa conversa, List<MensagemResponse> mensagens) {
        return new ConversaResponse(
                conversa.getId(),
                conversa.getWorkspaceId(),
                conversa.getTerritorioId(),
                conversa.getContextEntityType(),
                conversa.getContextEntityId(),
                conversa.getTitulo(),
                conversa.getCreatedByPessoaId(),
                conversa.getStatus(),
                conversa.getCreatedAt(),
                conversa.getUpdatedAt(),
                unreadCount(conversa),
                mensagens
        );
    }

    private MensagemResponse toMessageResponse(Mensagem mensagem, List<MensagemAnexo> anexos) {
        return new MensagemResponse(
                mensagem.getId(),
                mensagem.getWorkspaceId(),
                mensagem.getConversaId(),
                mensagem.getSenderPessoaId(),
                mensagem.getSenderNome(),
                mensagem.getCorpo(),
                mensagem.getLatitude(),
                mensagem.getLongitude(),
                mensagem.getLocalDescricao(),
                mensagem.getLinkedEntityType(),
                mensagem.getLinkedEntityId(),
                mensagem.getClientMessageId(),
                mensagem.getDeviceId(),
                mensagem.getStatus(),
                mensagem.getOccurredAt(),
                mensagem.getRecordedAt(),
                mensagem.getCreatedAt(),
                anexos.stream().map(this::toAttachmentResponse).toList(),
                List.of()
        );
    }

    private MensagemAnexoResponse toAttachmentResponse(MensagemAnexo anexo) {
        return new MensagemAnexoResponse(
                anexo.getId(),
                anexo.getOriginalFilename(),
                anexo.getContentType(),
                anexo.getSizeBytes(),
                anexo.getAttachmentType(),
                anexo.getCreatedAt()
        );
    }

    private record ContextReference(String type, String id) {
    }

    private record AttachmentFingerprint(
            String filename,
            String contentType,
            long size,
            String sha256
    ) {
    }

    private record MessagePayload(
            Long conversaId,
            String corpo,
            Double latitude,
            Double longitude,
            String localDescricao,
            String linkedEntityType,
            String linkedEntityId,
            String clientMessageId,
            String deviceId,
            String occurredAt,
            List<AttachmentFingerprint> attachments
    ) {
    }
}
