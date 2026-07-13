package com.angico.common;

import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/health")
public class HealthController {

    private final JdbcTemplate jdbc;

    public HealthController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping
    public Map<String, String> health() {
        return Map.of("status", "UP");
    }

    @GetMapping("/ready")
    public ResponseEntity<Map<String, String>> readiness() {
        try {
            Integer result = jdbc.queryForObject("SELECT 1", Integer.class);
            if (Integer.valueOf(1).equals(result)) {
                return ResponseEntity.ok(Map.of("status", "UP"));
            }
        } catch (RuntimeException exception) {
            return unavailable();
        }
        return unavailable();
    }

    private ResponseEntity<Map<String, String>> unavailable() {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of("status", "DOWN"));
    }
}
