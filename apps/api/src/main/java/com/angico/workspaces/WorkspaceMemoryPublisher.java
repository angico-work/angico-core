package com.angico.workspaces;

import com.angico.common.ClockProvider;
import com.angico.core.memory.MemoryEvent;
import com.angico.core.memory.MemoryRelationMetadata;
import com.angico.core.memory.OperationalMemoryService;
import com.angico.core.ontology.OntologyService;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class WorkspaceMemoryPublisher {

    private static final String TIPO_WORKSPACE = OntologyService.WORKSPACE;
    private static final String TIPO_PESSOA = OntologyService.PESSOA;
    private static final String RELACAO_MEMBRO = "POSSUI_MEMBRO";
    private static final String SOURCE = "api";

    private final OperationalMemoryService memory;
    private final ClockProvider clock;

    public WorkspaceMemoryPublisher(OperationalMemoryService memory, ClockProvider clock) {
        this.memory = memory;
        this.clock = clock;
    }

    public void publicarCriado(Workspace workspace, String actorId) {
        registrarObjeto(workspace);
        Map<String, Object> payload = new HashMap<>();
        payload.put("nome", workspace.getNome());
        payload.put("slug", workspace.getSlug());
        memory.registrarEvento(new MemoryEvent(
                workspace.getSlug(), TIPO_WORKSPACE, workspace.getSlug(), "workspace.criado", SOURCE,
                actorId, null, null, null, 1, workspace.getCreatedAt(), payload));
    }

    public void publicarAtualizado(Workspace workspace, String actorId) {
        registrarObjeto(workspace);
        memory.registrarEvento(new MemoryEvent(
                workspace.getSlug(), TIPO_WORKSPACE, workspace.getSlug(), "workspace.atualizado", SOURCE,
                actorId, null, null, null, 1, workspace.getUpdatedAt(), Map.of("status", status(workspace))));
    }

    public void publicarMembroAdicionado(WorkspaceMember member, String actorId) {
        sincronizarMembro(member, member.getStatus(), actorId);
        publicarEventoMembro(member, "workspace.membro_adicionado", member.getStatus(), actorId, member.getJoinedAt());
    }

    public void publicarMembroAtualizado(WorkspaceMember member, String actorId) {
        sincronizarMembro(member, member.getStatus(), actorId);
        publicarEventoMembro(member, "workspace.membro_atualizado", member.getStatus(), actorId, clock.now());
    }

    public void publicarMembroRemovido(WorkspaceMember member, String actorId) {
        sincronizarMembro(member, "INACTIVE", actorId);
        publicarEventoMembro(member, "workspace.membro_removido", "INACTIVE", actorId, clock.now());
    }

    private void sincronizarMembro(WorkspaceMember member, String memberStatus, String actorId) {
        memory.registrarObjeto(member.getWorkspaceId(), TIPO_PESSOA, member.getActorId(), null,
                member.getDisplayName(), memberStatus, SOURCE);
        if ("ACTIVE".equals(memberStatus)) {
            memory.registrarRelacaoAtiva(member.getWorkspaceId(), TIPO_WORKSPACE, member.getWorkspaceId(),
                    TIPO_PESSOA, member.getActorId(), RELACAO_MEMBRO,
                    new MemoryRelationMetadata(SOURCE, null, actorId, null));
            return;
        }
        memory.encerrarRelacaoAtiva(member.getWorkspaceId(), TIPO_WORKSPACE, member.getWorkspaceId(),
                TIPO_PESSOA, member.getActorId(), RELACAO_MEMBRO);
    }

    private void publicarEventoMembro(
            WorkspaceMember member,
            String eventType,
            String memberStatus,
            String actorId,
            Instant occurredAt
    ) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("actorId", member.getActorId());
        payload.put("role", member.getRole());
        payload.put("status", memberStatus);
        memory.registrarEvento(new MemoryEvent(
                member.getWorkspaceId(), TIPO_WORKSPACE, member.getWorkspaceId(), eventType, SOURCE,
                actorId, null, null, null, 1, occurredAt, payload));
    }

    private void registrarObjeto(Workspace workspace) {
        memory.registrarObjeto(workspace.getSlug(), TIPO_WORKSPACE, workspace.getSlug(),
                workspace.getSlug(), workspace.getNome(), status(workspace), SOURCE);
    }

    private static String status(Workspace workspace) {
        return workspace.getStatus() == null ? "ACTIVE" : workspace.getStatus();
    }
}
