package com.angico.intelligence;

import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.core.io.ClassPathResource;

final class IntelligenceTestDatabase {
    final DriverManagerDataSource ds = new DriverManagerDataSource("jdbc:h2:mem:ai-"+UUID.randomUUID()+";MODE=PostgreSQL;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000", "sa", "");
    final JdbcTemplate jdbc = new JdbcTemplate(ds);
    final DataSourceTransactionManager tx = new DataSourceTransactionManager(ds);
    IntelligenceTestDatabase() {
        new ResourceDatabasePopulator(new ClassPathResource("db/migration/h2/V0__complete_schema.sql"), new ClassPathResource("db/migration/h2/V7__api_intelligence.sql"), new ClassPathResource("db/migration/h2/V8__intelligence_feedback.sql")).execute(ds);
        jdbc.update("insert into pessoa(workspace_id,nome,angico_id,created_at) values ('w','Test','actor',current_timestamp), ('w','Test 2','actor2',current_timestamp)");
        jdbc.update("insert into workspace(slug,nome,created_at) values ('w','Workspace',current_timestamp),('other','Other',current_timestamp)");
        jdbc.update("insert into observacao_territorial(workspace_id,categoria,titulo,descricao,urgencia,status,created_at) values ('w','Resíduos','Lixo na praça','Relato sintético','MEDIA','ABERTA',current_timestamp)");
    }
}
