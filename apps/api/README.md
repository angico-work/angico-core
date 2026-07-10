# Angico API

API Spring Boot do Angico. Este projeto é executado e implantado de forma independente do site público e da aplicação operacional.

## Desenvolvimento

```bash
mvn spring-boot:run
```

A API inicia em `http://localhost:8082` por padrão. As variáveis suportadas para desenvolvimento estão documentadas em `.env.example`; o Spring pode recebê-las pelo ambiente do processo.

A autenticação é obrigatória por padrão. O usuário de demonstração só é criado quando `ANGICO_SEED_DEMO_LEADER=true` e `ANGICO_SEED_DEMO_LEADER_PASSWORD` possui uma senha definida explicitamente.

## Testes

```bash
mvn test
```

O endpoint de saúde está disponível em `GET /health`.

## Migração de sessão e identidade

O Flyway fica desativado por padrão porque bancos existentes foram criados por `hibernate.ddl-auto=update` e ainda não possuem histórico de migrations. A migration `V1__session_and_identity_constraints.sql` é aditiva, mas os índices únicos recusam dados legados duplicados em vez de apagar ou escolher registros silenciosamente.

Antes de ativar `ANGICO_FLYWAY_ENABLED=true` em um banco existente:

1. faça backup do banco;
2. execute as consultas de duplicidade no cabeçalho da migration e resolva os conflitos preservando os registros;
3. crie uma baseline Flyway na versão `0` para o schema legado;
4. execute a migration e só então inicie o perfil `prod`, que usa `ddl-auto=validate`.

Não execute esse procedimento contra `apps/api/data` durante testes. A suíte de segurança usa bancos H2 isolados em memória.
