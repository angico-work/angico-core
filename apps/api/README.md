# Angico API

API Spring Boot do Angico. O projeto possui build, configuração, testes e persistência independentes do site público e da aplicação operacional.

## Desenvolvimento

```bash
mvn spring-boot:run
```

A API inicia em `http://localhost:8082` por padrão. As variáveis suportadas para desenvolvimento estão documentadas em `.env.example`; o Spring pode recebê-las pelo ambiente do processo.

A autenticação é obrigatória por padrão. O usuário de demonstração só é criado quando `ANGICO_SEED_DEMO_LEADER=true` e `ANGICO_SEED_DEMO_LEADER_PASSWORD` possui uma senha definida explicitamente.

## Verificação local

```bash
mvn clean verify
scripts/smoke-prod-postgres.sh
docker build -t angico-api:local .
```

O smoke requer Docker, cria um PostgreSQL efêmero no computador local, valida o perfil `prod` e remove o container ao terminar. Para provar compatibilidade com uma revisão anterior:

```bash
ANGICO_SMOKE_UPGRADE_FROM_REF=<commit-anterior> scripts/smoke-prod-postgres.sh
```

Nenhum desses comandos usa banco remoto ou publica a aplicação.

`GET /health` informa que o processo está ativo. `GET /health/ready` também verifica uma consulta ao banco e só responde como pronto quando a conexão está disponível.

## Banco e migrations

No perfil `prod`, o inicializador Flyway do Spring Boot executa antes do JPA. Depois das migrations, Hibernate usa `ddl-auto=validate` e encerra o startup se o schema não corresponder ao modelo.

| Versão | Conteúdo |
| --- | --- |
| `V0` | schema integral para banco vazio |
| `V1` | sessões autenticadas |
| `V2` | unicidade de identidade e e-mail |
| `V3` | idempotência de mutações offline |
| `V4` | evidências, resultados, organizações e recursos |
| `V5` | mensagens contextuais e recibos de leitura |
| `V6` | vínculo explícito entre missão e território |

Antes de usar um banco existente em uma publicação futura:

1. faça backup do banco;
2. execute o preflight abaixo e resolva conflitos preservando os registros;
3. valide o upgrade em uma cópia isolada; não crie a baseline manualmente.

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

Em banco vazio, Flyway executa `V0` até `V6`. Em banco não vazio sem histórico, `baselineOnMigrate` registra a versão `0` e aplica `V1` até `V6`, sem executar `V0` sobre tabelas existentes. Bancos já versionados continuam na própria versão e validam o histórico sem reescrever checksums.

Não execute migrations contra `apps/api/data` durante testes. A suíte usa H2 em memória e o smoke usa PostgreSQL efêmero. Antes de qualquer migração futura em um banco persistente, teste o upgrade em uma cópia anonimizada e verifique backup e restauração.

## Uploads

O diretório configurado por `ANGICO_UPLOAD_DIR` precisa ser privado e persistente em uma publicação futura. Cada arquivo é limitado a `2 MB` por padrão; nome, extensão, MIME, assinatura do conteúdo e tamanho são validados antes da gravação. O limite total do request é configurado separadamente por `ANGICO_UPLOAD_MAX_REQUEST_SIZE`.

Consulte [segurança](../../docs/SECURITY.md), [ontologia](../../docs/ONTOLOGY.md) e [operação futura](../../docs/DEPLOYMENT.md) antes de preparar um ambiente externo.
