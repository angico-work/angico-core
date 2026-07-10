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
