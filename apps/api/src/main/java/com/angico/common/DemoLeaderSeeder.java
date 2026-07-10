package com.angico.common;

import com.angico.auth.AuthService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DemoLeaderSeeder implements CommandLineRunner {

    private final AuthService authService;
    private final boolean enabled;
    private final String password;

    public DemoLeaderSeeder(
            AuthService authService,
            @Value("${angico.seed-demo-leader:false}") boolean enabled,
            @Value("${angico.seed-demo-leader-password:}") String password
    ) {
        this.authService = authService;
        this.enabled = enabled;
        this.password = password;
    }

    @Override
    public void run(String... args) {
        if (!enabled) {
            return;
        }
        if (password == null || password.isBlank()) {
            throw new IllegalStateException(
                    "ANGICO_SEED_DEMO_LEADER_PASSWORD is required when demo seeding is enabled.");
        }
        authService.ensureLeader(
                AuthService.DEFAULT_WORKSPACE_ID,
                "Júlia Santos",
                "julia@angico.demo",
                "julia",
                "LIDER",
                password
        );
    }
}
