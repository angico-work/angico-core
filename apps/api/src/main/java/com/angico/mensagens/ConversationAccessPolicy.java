package com.angico.mensagens;

import com.angico.common.ForbiddenException;
import com.angico.core.memory.MemoryRelationRepository;
import com.angico.core.ontology.OntologyService;
import com.angico.workspaces.WorkspaceAuthorizationService;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class ConversationAccessPolicy {

    private static final Set<String> ADMIN_ROLES = Set.of("OWNER", "ADMIN");

    private final ConversaRepository conversas;
    private final MensagemRepository mensagens;
    private final MensagemAnexoRepository anexos;
    private final MemoryRelationRepository relations;
    private final WorkspaceAuthorizationService authorization;

    public ConversationAccessPolicy(
            ConversaRepository conversas,
            MensagemRepository mensagens,
            MensagemAnexoRepository anexos,
            MemoryRelationRepository relations,
            WorkspaceAuthorizationService authorization
    ) {
        this.conversas = conversas;
        this.mensagens = mensagens;
        this.anexos = anexos;
        this.relations = relations;
        this.authorization = authorization;
    }

    public void requireAccess(Conversa conversa) {
        authorization.requireMember(conversa.getWorkspaceId());
        if (!canAccess(conversa)) {
            throw new ForbiddenException("Apenas participantes podem acessar esta conversa.");
        }
    }

    public boolean canAccess(Conversa conversa) {
        if (authorization.hasRole(conversa.getWorkspaceId(), ADMIN_ROLES)) {
            return true;
        }
        return relations
                .existsByWorkspaceIdAndOriginTypeAndOriginIdAndDestinationTypeAndDestinationIdAndRelationTypeAndActiveTrue(
                        conversa.getWorkspaceId(),
                        OntologyService.CONVERSA,
                        String.valueOf(conversa.getId()),
                        OntologyService.PESSOA,
                        String.valueOf(authorization.currentPessoa().getId()),
                        "TEM_PARTICIPANTE"
                );
    }

    public boolean canAccessMemoryNode(String workspaceId, String entityType, String entityId) {
        if (entityType == null) {
            return true;
        }
        return switch (entityType.strip().toUpperCase(Locale.ROOT)) {
            case OntologyService.CONVERSA -> conversation(workspaceId, entityId)
                    .map(this::canAccess)
                    .orElse(false);
            case OntologyService.MENSAGEM -> messageConversation(workspaceId, entityId)
                    .map(this::canAccess)
                    .orElse(false);
            case OntologyService.ANEXO -> attachmentConversation(workspaceId, entityId)
                    .map(this::canAccess)
                    .orElse(false);
            default -> true;
        };
    }

    private Optional<Conversa> conversation(String workspaceId, String rawId) {
        Long id = numericId(rawId);
        if (id == null) {
            return Optional.empty();
        }
        return conversas.findById(id)
                .filter(conversa -> workspaceId.equals(conversa.getWorkspaceId()));
    }

    private Optional<Conversa> messageConversation(String workspaceId, String rawId) {
        Long id = numericId(rawId);
        if (id == null) {
            return Optional.empty();
        }
        return mensagens.findById(id)
                .filter(message -> workspaceId.equals(message.getWorkspaceId()))
                .flatMap(message -> conversation(workspaceId, String.valueOf(message.getConversaId())));
    }

    private Optional<Conversa> attachmentConversation(String workspaceId, String rawId) {
        Long id = numericId(rawId);
        if (id == null) {
            return Optional.empty();
        }
        return anexos.findById(id)
                .filter(attachment -> workspaceId.equals(attachment.getWorkspaceId()))
                .flatMap(attachment -> messageConversation(
                        workspaceId, String.valueOf(attachment.getMensagemId())));
    }

    private Long numericId(String value) {
        if (value == null || !value.matches("[1-9][0-9]{0,18}")) {
            return null;
        }
        try {
            return Long.valueOf(value);
        } catch (NumberFormatException exception) {
            return null;
        }
    }
}
