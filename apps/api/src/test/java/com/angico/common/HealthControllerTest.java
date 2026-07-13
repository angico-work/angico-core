package com.angico.common;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

class HealthControllerTest {

    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final HealthController controller = new HealthController(jdbc);

    @Test
    void readinessRequiresADatabaseRoundTrip() {
        when(jdbc.queryForObject("SELECT 1", Integer.class)).thenReturn(1);

        assertEquals(HttpStatus.OK, controller.readiness().getStatusCode());
    }

    @Test
    void readinessFailsClosedWhenTheDatabaseIsUnavailable() {
        when(jdbc.queryForObject("SELECT 1", Integer.class)).thenThrow(new IllegalStateException("offline"));

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, controller.readiness().getStatusCode());
    }
}
