package com.angico.common;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.angico.AngicoApplication;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

@ActiveProfiles("prod")
@SpringBootTest(
        classes = AngicoApplication.class,
        webEnvironment = SpringBootTest.WebEnvironment.NONE,
        properties = {
                "spring.datasource.url=jdbc:h2:mem:prod-bootstrap;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
                "spring.datasource.username=sa",
                "spring.datasource.password=",
                "angico.allowed-origins=https://app.example.test",
                "angico.seed-demo-leader=false"
        }
)
class ProductionProfileBootstrapTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void productionProfileBootstrapsAndVersionsACompletelyEmptyDatabase() {
        assertEquals(List.of("0", "1", "2", "3", "4", "5", "6"), jdbcTemplate.queryForList(
                "SELECT \"version\" FROM \"flyway_schema_history\" "
                        + "WHERE \"success\" = TRUE AND \"version\" IS NOT NULL "
                        + "ORDER BY \"installed_rank\"",
                String.class));
        assertTrue(Boolean.TRUE.equals(jdbcTemplate.queryForObject(
                "SELECT COUNT(*) > 0 FROM information_schema.tables "
                        + "WHERE table_name = 'AUTH_SESSION'",
                Boolean.class)));
        assertTrue(Boolean.TRUE.equals(jdbcTemplate.queryForObject(
                "SELECT COUNT(*) > 0 FROM information_schema.table_constraints "
                        + "WHERE constraint_name = 'FK_AUTH_SESSION_PESSOA'",
                Boolean.class)));
    }
}
