package com.angico.mensagens;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import com.angico.common.ForbiddenException;
import com.angico.core.memory.MemoryEvent;
import com.angico.core.memory.MemoryRelationMetadata;
import com.angico.core.memory.MemoryRelationRepository;
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
import org.springframework.stereotype.Service;
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
    private final PessoaRepository pessoaRepository;
    private final TerritorioRepository territorioRepository;
    private final WorkspaceAuthorizationService authorizationService;
    private final MemoryRelationRepository relationRepository;
    private final WorkspaceMemberRepository memberRepository;
    private final OperationalMemoryService memoryService;
    private final OntologyService ontologyService;
    private final WorkspaceReferenceValidator referenceValidator;
    private final Path uploadRoot;
    private final long maxBytes;
    private final Set<String> allowedContentTypes;

    public MensagemService(
            ConversaRepository conversaRepository,
            MensagemRepository mensagemRepository,
            MensagemAnexoRepository anexoRepository,
            PessoaRepository pessoaRepository,
            TerritorioRepository territorioRepository,
            WorkspaceAuthorizationService authorizationService,
            MemoryRelationRepository relationRepository,
            WorkspaceMemberRepository memberRepository,
            OperationalMemoryService memoryService,
            OntologyService ontologyService,
            WorkspaceReferenceValidator referenceValidator,
            @Value("${angico.uploads.dir:uploads}") String uploadDir,
            @Value("${angico.uploads.max-bytes:2097152}") long maxBytes,
            @Value("${angico.uploads.allowed-content-types}") String allowedContentTypes
    ) {
        this.conversaRepository = conversaRepository;
        this.mensagemRepository = mensagemRepository;
        this.anexoRepository = anexoRepository;
        this.pessoaRepository = pessoaRepository;
        this.territorioRepository = territorioRepository;
        this.authorizationService = authorizationService;
        this.relationRepository = relationRepository;
        this.memberRepository = memberRepository;
        this.memoryService = memoryService;
        this.ontologyService = ontologyService;
        this.referenceValidator = referenceValidator;
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
        List<Mensagem> mensagens = mensagemRepository.findByConversaIdOrderByCreatedAtAsc(conversaId);
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

    @Transactional
    public ConversaResponse create(ConversaRequest request) {
        Pessoa actor = currentPessoa();
        String workspaceId = authorizationService.requireAuthorizedWorkspace(request.workspaceId());
        Territorio territorio = territorioRepository.findById(request.territorioId())
                .orElseThrow(() -> new IllegalArgumentException("Territorio nao encontrado: " + request.territorioId()));
        if (!workspaceId.equals(territorio.getWorkspaceId())) {
            throw new IllegalArgumentException("Territorio nao pertence ao workspace informado.");
        }

        Instant now = Instant.now();
        Conversa conversa = new Conversa();
        conversa.setWorkspaceId(workspaceId);
        conversa.setTerritorioId(territorio.getId());
        conversa.setTitulo(TerritorioService.requireText(request.titulo(), "titulo"));
        conversa.setCreatedByPessoaId(actor.getId());
        conversa.setStatus("ATIVA");
        conversa.setCreatedAt(now);
        conversa.setUpdatedAt(now);
        conversa = conversaRepository.save(conversa);

        String conversaId = String.valueOf(conversa.getId());
        memoryService.registrarObjeto(workspaceId, OntologyService.CONVERSA, conversaId, null, conversa.getTitulo(), "ATIVA", "api");
        memoryService.registrarRelacaoAtiva(
                workspaceId,
                OntologyService.CONVERSA,
                conversaId,
                OntologyService.TERRITORIO,
                String.valueOf(territorio.getId()),
                "PERTENCE_A",
                relationMetadata(actor, "Conversa territorial")
        );
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
                Map.of("titulo", conversa.getTitulo(), "territorioId", territorio.getId())
        ));

        return toResponse(conversa, List.of());
    }

    @Transactional
    public MensagemResponse send(
            Long conversaId,
            String corpo,
            Double latitude,
            Double longitude,
            String localDescricao,
            String linkedEntityType,
            String linkedEntityId,
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

        Instant now = Instant.now();
        Mensagem mensagem = new Mensagem();
        mensagem.setWorkspaceId(conversa.getWorkspaceId());
        mensagem.setConversaId(conversa.getId());
        mensagem.setSenderPessoaId(actor.getId());
        mensagem.setSenderNome(actor.getNome());
        mensagem.setCorpo(corpo == null ? "" : corpo.trim());
        mensagem.setLatitude(latitude);
        mensagem.setLongitude(longitude);
        mensagem.setLocalDescricao(localDescricao);
        mensagem.setLinkedEntityType(normalizedLinkedType);
        mensagem.setLinkedEntityId(linkedEntityId == null || linkedEntityId.isBlank() ? null : linkedEntityId.trim());
        mensagem.setStatus("ENVIADA");
        mensagem.setCreatedAt(now);
        mensagem = mensagemRepository.save(mensagem);

        List<MensagemAnexo> anexos = saveAttachments(conversa.getWorkspaceId(), mensagem, attachments);
        conversa.setUpdatedAt(now);
        conversaRepository.save(conversa);
        registerMessageMemory(conversa, mensagem, anexos, actor, now);
        return toMessageResponse(mensagem, anexos);
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
        if (!path.startsWith(uploadRoot) || !Files.exists(path)) {
            throw new IllegalArgumentException("Arquivo nao encontrado.");
        }
        return new PathResource(path);
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
        Path destination = folder.resolve(storedName).normalize();
        if (!destination.startsWith(uploadRoot)) {
            throw new IllegalArgumentException("Nome de arquivo invalido.");
        }
        try {
            Files.createDirectories(folder);
            file.transferTo(destination);
        } catch (IOException ex) {
            throw new IllegalStateException("Falha ao gravar anexo.", ex);
        }

        MensagemAnexo anexo = new MensagemAnexo();
        anexo.setWorkspaceId(workspaceId);
        anexo.setMensagemId(mensagem.getId());
        anexo.setOriginalFilename(originalName);
        anexo.setContentType(contentType);
        anexo.setSizeBytes(file.getSize());
        anexo.setStoragePath(destination.toString());
        anexo.setAttachmentType(contentType.startsWith("image/") ? "IMAGEM" : "ARQUIVO");
        anexo.setCreatedAt(Instant.now());
        return anexoRepository.save(anexo);
    }

    private String sanitizeFilename(String value) {
        String filename = value == null || value.isBlank() ? "anexo" : Path.of(value).getFileName().toString();
        return filename.replaceAll("[^A-Za-z0-9._-]", "_");
    }

    private void registerMessageMemory(
            Conversa conversa,
            Mensagem mensagem,
            List<MensagemAnexo> anexos,
            Pessoa actor,
            Instant occurredAt
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
            memoryService.registrarRelacaoAtiva(workspaceId, OntologyService.LOCALIZACAO, localizacaoId, OntologyService.TERRITORIO,
                    String.valueOf(conversa.getTerritorioId()), "REFERE_SE_A",
                    relationMetadata(actor, "Localizacao em conversa territorial"));
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
        memoryService.registrarEvento(new MemoryEvent(
                workspaceId,
                OntologyService.MENSAGEM,
                mensagemId,
                "MENSAGEM_ENVIADA",
                "api",
                actor.getAngicoId(),
                null,
                null,
                null,
                1,
                occurredAt,
                payload
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
                conversa.getTitulo(),
                conversa.getCreatedByPessoaId(),
                conversa.getStatus(),
                conversa.getCreatedAt(),
                conversa.getUpdatedAt(),
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
                mensagem.getStatus(),
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
}
