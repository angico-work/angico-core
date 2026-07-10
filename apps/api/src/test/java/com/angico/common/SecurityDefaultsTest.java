package com.angico.common;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
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
        assertEquals("${ANGICO_PUBLIC_REGISTRATION:false}",
                property(sources, "angico.auth.public-registration"));
        assertEquals("${ANGICO_COOKIE_SECURE:true}", property(sources, "angico.auth.cookie-secure"));
        assertEquals("${ANGICO_SEED_DEMO_LEADER:false}", property(sources, "angico.seed-demo-leader"));
        assertEquals("${ANGICO_SEED_DEMO_LEADER_PASSWORD:}",
                property(sources, "angico.seed-demo-leader-password"));
        assertEquals("dev", property(sources, "spring.profiles.default"));
        assertEquals("${ANGICO_FLYWAY_ENABLED:false}", property(sources, "spring.flyway.enabled"));
    }

    @Test
    void developmentAndProductionProfilesMakeCookieAndDatabasePolicyExplicit() throws IOException {
        ClassPathResource dev = new ClassPathResource("application-dev.yml");
        ClassPathResource prod = new ClassPathResource("application-prod.yml");
        assertTrue(dev.exists(), "application-dev.yml must exist");
        assertTrue(prod.exists(), "application-prod.yml must exist");

        List<PropertySource<?>> devSources = new YamlPropertySourceLoader().load("dev", dev);
        List<PropertySource<?>> prodSources = new YamlPropertySourceLoader().load("prod", prod);
        assertEquals(false, property(devSources, "angico.auth.cookie-secure"));
        assertEquals(true, property(prodSources, "angico.auth.cookie-secure"));
        assertEquals("update", property(devSources, "spring.jpa.hibernate.ddl-auto"));
        assertEquals("validate", property(prodSources, "spring.jpa.hibernate.ddl-auto"));
        assertEquals("${ANGICO_ALLOWED_ORIGINS}", property(prodSources, "angico.allowed-origins"));
    }

    @Test
    void productionMigrationIsAdditiveAndFlywayActivationIsOptIn() throws IOException {
        ClassPathResource migration = new ClassPathResource(
                "db/migration/V1__session_and_identity_constraints.sql");
        assertTrue(migration.exists(), "the versioned production migration must exist");
        String sql = migration.getContentAsString(StandardCharsets.UTF_8).toLowerCase();
        assertTrue(sql.contains("create table if not exists auth_session"));
        assertTrue(sql.contains("create unique index"));
        assertTrue(sql.contains("lower(email)"));
        assertTrue(sql.contains("lower(angico_id)"));
        assertFalse(sql.contains("delete from"));
        assertFalse(sql.contains("drop table"));
    }

    @Test
    void pomDeclaresJacksonDatabindOnlyOnce() throws IOException {
        Path pomPath = Files.exists(Path.of("pom.xml"))
                ? Path.of("pom.xml")
                : Path.of("apps/api/pom.xml");
        String pom = Files.readString(pomPath);
        assertEquals(1, occurrences(pom, "<artifactId>jackson-databind</artifactId>"));
    }

    @Test
    void productionDeploymentActivatesTheFailClosedProfile() throws IOException {
        Path renderPath = Files.exists(Path.of("render.yaml"))
                ? Path.of("render.yaml")
                : Path.of("../..", "render.yaml");
        String render = Files.readString(renderPath);
        assertTrue(render.contains("key: SPRING_PROFILES_ACTIVE"));
        assertTrue(render.contains("value: prod"));
        assertTrue(render.contains("key: ANGICO_PUBLIC_REGISTRATION"));
        assertTrue(render.contains("key: ANGICO_FLYWAY_ENABLED"));
    }

    private int occurrences(String value, String needle) {
        int count = 0;
        int offset = 0;
        while ((offset = value.indexOf(needle, offset)) >= 0) {
            count++;
            offset += needle.length();
        }
        return count;
    }

    private Object property(List<PropertySource<?>> sources, String name) {
        return sources.stream()
                .map(source -> source.getProperty(name))
                .filter(value -> value != null)
                .findFirst()
                .orElse(null);
    }
}
