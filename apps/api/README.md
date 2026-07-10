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
