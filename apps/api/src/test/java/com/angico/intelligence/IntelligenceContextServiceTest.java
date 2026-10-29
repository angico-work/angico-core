package com.angico.intelligence;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.angico.common.ForbiddenException;
import com.angico.workspaces.WorkspaceAuthorizationService;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class IntelligenceContextServiceTest {
    IntelligenceContextService context;
    JdbcTemplate jdbc;
    WorkspaceAuthorizationService authorization;

    @org.junit.jupiter.api.BeforeEach void setup() {
        var ds = new org.springframework.jdbc.datasource.DriverManagerDataSource(
            "jdbc:h2:mem:context-" + java.util.UUID.randomUUID() + ";MODE=PostgreSQL;DB_CLOSE_DELAY=-1", "sa", "");
        new org.springframework.jdbc.datasource.init.ResourceDatabasePopulator(
            new org.springframework.core.io.ClassPathResource("db/migration/h2/V0__complete_schema.sql")
        ).execute(ds);
        jdbc = new JdbcTemplate(ds);
        authorization = mock(WorkspaceAuthorizationService.class);
        context = new IntelligenceContextService(jdbc, authorization);
    }

    private void observation(String workspace, String title, String description) {
        jdbc.update("insert into observacao_territorial (workspace_id,categoria,titulo,descricao,urgencia,status,created_at) values (?, 'Resíduos', ?, ?, 'MEDIA','ABERTA', current_timestamp)", workspace,title,description);
    }

    @Test void deniesUnauthorizedWorkspaceBeforeReadingAnySources() {
        observation("other", "Lixo privado", "Segredo");
        doThrow(new ForbiddenException("Forbidden")).when(authorization).requireMember("other");
        assertThrows(ForbiddenException.class, () -> context.retrieve("other", "lixo"));
    }

    @Test void emptyOrIrrelevantWorkspaceProducesNoInventedSources() {
        assertTrue(context.retrieve("empty", "lixo").isEmpty());
        observation("a", "Praça arborizada", "Árvores");
        assertTrue(context.retrieve("a", "esgoto").isEmpty());
        assertTrue(context.retrieve("a", " ").isEmpty());
    }

    @Test void isolatesWorkspacesAndExcludesMessagesEvenWhenLexicallyRelevant() {
        observation("a", "Lixo na praça", "Coleta pendente");
        observation("b", "Lixo privado", "Segredo de outro workspace");
        jdbc.update("insert into memory_object (workspace_id,entity_type,entity_id,name,created_at,updated_at) values ('a','MENSAGEM','9','Lixo: conversa privada',current_timestamp,current_timestamp)");
        var result = context.retrieve("a", "lixo praça");
        assertEquals(1, result.size());
        assertEquals("OBSERVACAO", result.getFirst().entityType());
        assertEquals("Lixo na praça", result.getFirst().title());
        assertTrue(result.getFirst().excerpt().contains("Coleta pendente"));
    }

    @Test void boundsOutputAndRedactsContactsWithoutLosingOperationalText() {
        for (int i=0;i<30;i++) observation("a", "Lixo " + i,
            "Contato pessoa@example.org +55 (11) 99999-1234. " + "lixo ".repeat(300));
        var result = context.retrieve("a", "lixo");
        assertEquals(20,result.size());
        assertTrue(result.stream().mapToInt(s -> s.excerpt().length()).sum() <= 20_000);
        assertTrue(result.stream().noneMatch(s -> s.excerpt().contains("example.org") || s.excerpt().contains("99999")));
        assertEquals(result,context.retrieve("a", "lixo"));
    }

    @Test void retrievesAllFourOperationalTypesWithStableSourceReferences() {
        observation("a", "Lixo observado", "Coleta");
        jdbc.update("insert into problema_socioambiental (workspace_id,categoria,titulo,descricao,severidade,status,created_at) values ('a','Resíduos','Lixo acumulado','Coleta','MEDIA','ABERTO',current_timestamp)");
        jdbc.update("insert into acao (workspace_id,titulo,descricao,status,created_at) values ('a','Coleta de lixo','Mutirão','PLANEJADA',current_timestamp)");
        jdbc.update("insert into resultado (workspace_id,titulo,descricao,status,created_at,occurred_at) values ('a','Lixo recolhido','Relato','REGISTRADO',current_timestamp,current_timestamp)");
        var sources = context.retrieve("a", "lixo");
        assertEquals(java.util.Set.of("OBSERVACAO","PROBLEMA","ACAO","RESULTADO"), sources.stream().map(IntelligenceSource::entityType).collect(java.util.stream.Collectors.toSet()));
        for (var source : sources) assertEquals(source.entityType()+":"+source.entityId(), source.sourceId());
    }
}
