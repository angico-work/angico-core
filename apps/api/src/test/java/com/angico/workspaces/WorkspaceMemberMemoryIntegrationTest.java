package com.angico.workspaces;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.angico.core.memory.MemoryEventRepository;
import com.angico.core.memory.MemoryRelationRepository;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:workspace-member-memory;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "angico.seed-demo-leader=false"
})
@Transactional
class WorkspaceMemberMemoryIntegrationTest {

    private static final String WORKSPACE_ID = "workspace-a";

    @Autowired private WorkspaceMemoryPublisher publisher;
    @Autowired private MemoryRelationRepository relations;
    @Autowired private MemoryEventRepository events;

    @Test
    void addingAnInactiveMemberDoesNotCreateAnActiveMemoryRelation() {
        publisher.publicarMembroAdicionado(member("ana.sp", "INACTIVE"), "owner.sp");

        assertFalse(hasActiveMembership("ana.sp"));
        assertTrue(hasEvent("workspace.membro_adicionado"));
    }

    @Test
    void deactivatingOneMemberClosesOnlyThatPersonsRelationAndPublishesAnEvent() {
        WorkspaceMember ana = member("ana.sp", "ACTIVE");
        WorkspaceMember bia = member("bia.sp", "ACTIVE");
        publisher.publicarMembroAdicionado(ana, "owner.sp");
        publisher.publicarMembroAdicionado(bia, "owner.sp");

        ana.setStatus("INACTIVE");
        publisher.publicarMembroAtualizado(ana, "owner.sp");

        assertFalse(hasActiveMembership("ana.sp"));
        assertTrue(hasActiveMembership("bia.sp"));
        assertTrue(hasEvent("workspace.membro_atualizado"));
    }

    @Test
    void removingAMemberClosesThePersonsRelationAndPublishesAnEvent() {
        WorkspaceMember ana = member("ana.sp", "ACTIVE");
        publisher.publicarMembroAdicionado(ana, "owner.sp");

        publisher.publicarMembroRemovido(ana, "owner.sp");

        assertFalse(hasActiveMembership("ana.sp"));
        assertTrue(hasEvent("workspace.membro_removido"));
    }

    private WorkspaceMember member(String actorId, String status) {
        return new WorkspaceMember(
                WORKSPACE_ID,
                actorId,
                actorId,
                "MEMBER",
                status,
                Instant.parse("2026-07-10T12:00:00Z"));
    }

    private boolean hasActiveMembership(String actorId) {
        return relations
                .existsByWorkspaceIdAndOriginTypeAndOriginIdAndDestinationTypeAndDestinationIdAndRelationTypeAndActiveTrue(
                        WORKSPACE_ID,
                        "WORKSPACE",
                        WORKSPACE_ID,
                        "PESSOA",
                        actorId,
                        "POSSUI_MEMBRO");
    }

    private boolean hasEvent(String eventType) {
        return events.findByWorkspaceIdOrderBySequenceAsc(WORKSPACE_ID).stream()
                .anyMatch(event -> eventType.equals(event.getEventType()));
    }
}
