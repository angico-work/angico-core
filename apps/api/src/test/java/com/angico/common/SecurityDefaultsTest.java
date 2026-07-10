package com.angico.common;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.io.IOException;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.core.env.PropertySource;
import org.springframework.core.io.ClassPathResource;

class SecurityDefaultsTest {

    @Test
    void authenticationAndDemoSeedFailClosedByDefault() throws IOException {
        List<PropertySource<?>> sources = new YamlPropertySourceLoader()
                .load("application", new ClassPathResource("application.yml"));

        assertEquals("${ANGICO_AUTH_REQUIRED:true}", property(sources, "angico.auth.required"));
        assertEquals("${ANGICO_SEED_DEMO_LEADER:false}", property(sources, "angico.seed-demo-leader"));
        assertEquals("${ANGICO_SEED_DEMO_LEADER_PASSWORD:}",
                property(sources, "angico.seed-demo-leader-password"));
    }

    private Object property(List<PropertySource<?>> sources, String name) {
        return sources.stream()
                .map(source -> source.getProperty(name))
                .filter(value -> value != null)
                .findFirst()
                .orElse(null);
    }
}
