package com.angico.common;

import jakarta.persistence.EntityManagerFactory;
import java.sql.SQLException;
import java.util.Locale;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.springframework.beans.factory.SmartInitializingSingleton;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Transitional bootstrap for databases whose base schema is still managed by
 * Hibernate. EntityManagerFactory is injected deliberately: its initialization
 * completes the non-destructive schema update before versioned constraints run.
 */
@Component
@ConditionalOnProperty(name = "angico.database.migrations-enabled", havingValue = "true")
public class DatabaseMigrationBootstrap implements SmartInitializingSingleton {

    private final DataSource dataSource;
    private final EntityManagerFactory entityManagerFactory;

    public DatabaseMigrationBootstrap(
            DataSource dataSource,
            EntityManagerFactory entityManagerFactory
    ) {
        this.dataSource = dataSource;
        this.entityManagerFactory = entityManagerFactory;
    }

    @Override
    public void afterSingletonsInstantiated() {
        // Touching the metamodel documents and verifies the ordering dependency.
        entityManagerFactory.getMetamodel();
        String vendor = databaseVendor();
        Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration/" + vendor)
                .baselineOnMigrate(true)
                .baselineVersion(MigrationVersion.fromVersion("0"))
                .cleanDisabled(true)
                .validateMigrationNaming(true)
                .load()
                .migrate();
    }

    private String databaseVendor() {
        try (var connection = dataSource.getConnection()) {
            String product = connection.getMetaData().getDatabaseProductName()
                    .toLowerCase(Locale.ROOT);
            if (product.contains("postgresql")) {
                return "postgresql";
            }
            if (product.equals("h2")) {
                return "h2";
            }
            throw new IllegalStateException("Unsupported database for Angico migrations: " + product);
        } catch (SQLException exception) {
            throw new IllegalStateException("Could not inspect database for Angico migrations", exception);
        }
    }
}
