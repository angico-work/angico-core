package com.angico.workspaces;

import com.angico.core.memory.MemoryEvent;
import com.angico.core.memory.OperationalMemoryService;
import com.angico.core.ontology.OntologyService;
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

    public WorkspaceMemoryPublisher(OperationalMemoryService memory) {
        this.memory = memory;
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
        memory.registrarObjeto(member.getWorkspaceId(), TIPO_PESSOA, member.getActorId(), null,
                member.getDisplayName(), member.getStatus(), SOURCE);
        memory.registrarRelacaoAtiva(member.getWorkspaceId(), TIPO_WORKSPACE, member.getWorkspaceId(),
                TIPO_PESSOA, member.getActorId(), RELACAO_MEMBRO, SOURCE, null);
        Map<String, Object> payload = new HashMap<>();
        payload.put("actorId", member.getActorId());
        payload.put("role", member.getRole());
        memory.registrarEvento(new MemoryEvent(
                member.getWorkspaceId(), TIPO_WORKSPACE, member.getWorkspaceId(), "workspace.membro_adicionado", SOURCE,
                actorId, null, null, null, 1, member.getJoinedAt(), payload));
    }

    private void registrarObjeto(Workspace workspace) {
        memory.registrarObjeto(workspace.getSlug(), TIPO_WORKSPACE, workspace.getSlug(),
                workspace.getSlug(), workspace.getNome(), status(workspace), SOURCE);
    }

    private static String status(Workspace workspace) {
        return workspace.getStatus() == null ? "ACTIVE" : workspace.getStatus();
    }
}
