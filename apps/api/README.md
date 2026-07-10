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

O perfil `prod` usa temporariamente `hibernate.ddl-auto=update` para materializar o modelo JPA real e, ainda durante a inicialização, aplica migrations Flyway aditivas. O coordenador depende do `EntityManagerFactory`, cria a baseline `0` automaticamente e executa V1/V2 antes de a aplicação ficar pronta. `render.yaml` habilita esse caminho com `ANGICO_FLYWAY_ENABLED=true`; qualquer duplicidade ou falha de migration encerra o startup.

Antes do primeiro deploy contra um banco existente:

1. faça backup do banco;
2. execute o preflight abaixo e resolva conflitos preservando os registros;
3. implante normalmente; não crie a baseline manualmente.

```sql
SELECT lower(btrim(email)), count(*)
FROM pessoa
WHERE email IS NOT NULL AND btrim(email) <> ''
GROUP BY lower(btrim(email))
HAVING count(*) > 1;

SELECT lower(regexp_replace(btrim(angico_id), '^@', '')), count(*)
FROM pessoa
WHERE angico_id IS NOT NULL AND btrim(angico_id) <> ''
GROUP BY lower(regexp_replace(btrim(angico_id), '^@', ''))
HAVING count(*) > 1;
```

Esse regime é transicional: depois de gerar e revisar uma baseline completa do schema, a meta é voltar `ddl-auto` para `validate`. Não execute migrations contra `apps/api/data` durante testes. A suíte usa bancos H2 isolados em memória e também prova boot do perfil `prod` sobre banco vazio.
