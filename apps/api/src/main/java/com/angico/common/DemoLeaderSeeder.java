package com.angico.common;

import com.angico.auth.AuthService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * Seeds a single demo leader so the app is immediately usable: the login form
 * is pre-filled with these credentials. Idempotent via AuthService.ensureLeader.
 * Disable in real deployments with {@code angico.seed-demo-leader=false}.
 */
@Component
public class DemoLeaderSeeder implements CommandLineRunner {

    private final AuthService authService;
    private final boolean enabled;

    public DemoLeaderSeeder(
            AuthService authService,
            @Value("${angico.seed-demo-leader:true}") boolean enabled
    ) {
        this.authService = authService;
        this.enabled = enabled;
    }

    @Override
    public void run(String... args) {
        if (!enabled) {
            return;
        }
        authService.ensureLeader(
                AuthService.DEFAULT_WORKSPACE_ID,
                "Júlia Santos",
                "julia@angico.demo",
                "julia",
                "LIDER",
                "angico-demo"
        );
    }
}
