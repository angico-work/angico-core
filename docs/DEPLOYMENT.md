# Operação e publicação

Este documento descreve o procedimento futuro. Os workflows do repositório apenas verificam código; não publicam aplicações, não promovem ambientes e não executam migrations em banco remoto.

## Unidades independentes

| Unidade | Diretório | Artefato | Porta local |
| --- | --- | --- | --- |
| Site público | `apps/site` | arquivos estáticos | `5175` |
| Aplicação | `apps/app` | arquivos estáticos e proxy `/api` | `5176` |
| API | `apps/api` | imagem Docker/JAR | `8082` |

Site e aplicação não compartilham bundle. A API pode evoluir primeiro com contratos retrocompatíveis; o app só deve consumir um campo depois que ele estiver disponível no ambiente de destino.

## Gate local obrigatório

```bash
cd apps/site
npm ci
npm run typecheck
npm test -- --run
npm run build
npm audit --audit-level=high

cd ../app
npm ci
npm run typecheck
npm test -- --run
npm run build
npm audit --audit-level=high

cd ../api
mvn clean verify
scripts/smoke-prod-postgres.sh
docker build -t angico-api:local .
```

O smoke de PostgreSQL usa container efêmero local. Para validar upgrade de uma revisão anterior:

```bash
cd apps/api
ANGICO_SMOKE_UPGRADE_FROM_REF=<commit-anterior> scripts/smoke-prod-postgres.sh
```

## Ordem de uma liberação futura

1. congelar o commit aprovado e registrar as versões dos três artefatos;
2. gerar backup restaurável do banco e do armazenamento de arquivos;
3. executar o preflight de duplicidades descrito em `SECURITY.md`;
4. publicar a API compatível, sem remover campos usados pelo app anterior;
5. confirmar saúde, autenticação, isolamento e migrations;
6. publicar a aplicação autenticada;
7. confirmar login, criação offline, reconexão, mensagens e Rastro;
8. publicar o site público por último;
9. observar erros e latência antes de ampliar tráfego.

Essas etapas são uma progressão técnica real. O histórico Git deve refletir mudanças focadas e revisáveis; datas ou autores nunca devem ser fabricados para simular um ritmo diferente.

## Configuração da API

Produção exige, no mínimo:

```text
SPRING_PROFILES_ACTIVE=prod
ANGICO_DB_URL=jdbc:postgresql://...
ANGICO_DB_USER=...
ANGICO_DB_PASSWORD=...
ANGICO_ALLOWED_ORIGINS=https://app.exemplo
ANGICO_AUTH_REQUIRED=true
ANGICO_PUBLIC_REGISTRATION=false
ANGICO_COOKIE_SECURE=true
ANGICO_FLYWAY_ENABLED=true
ANGICO_SEED_DEMO_LEADER=false
ANGICO_UPLOAD_DIR=/caminho/persistente
ANGICO_GEOCODER_USER_AGENT=Angico/versao contato@dominio
```

Credenciais não entram em arquivo versionado. O diretório de uploads precisa ser persistente, privado e incluído no plano de backup.

## Configuração da aplicação

No desenvolvimento, `VITE_DEV_API_PROXY_TARGET` aponta para a API local. Em uma publicação same-origin, o proxy do app recebe apenas uma origem HTTPS fixa em `ANGICO_API_ORIGIN`; o navegador continua chamando `/api` para preservar cookies `SameSite=Lax`.

`ANGICO_API_ORIGIN` é variável do servidor. Não use prefixo `VITE_`, credenciais, caminho, query ou fragmento.

## Configuração do site

```text
VITE_APP_URL=https://app.exemplo
VITE_CONTACT_API_URL=https://contato.exemplo/formulario
```

Sem uma variável, o canal correspondente permanece indisponível de forma explícita. O site não possui fallback que simule cadastro ou envio.

## Banco e migrations

Flyway aplica a baseline `0` e migrations aditivas específicas para H2 e PostgreSQL. O perfil de produção ainda usa `hibernate.ddl-auto=update` antes do Flyway enquanto a baseline completa não existe. Essa ordem é transicional e precisa ser tratada como risco de lançamento.

Antes de trocar para `validate`:

1. gerar o DDL completo a partir de banco vazio;
2. comparar H2 e PostgreSQL;
3. testar upgrade de uma cópia anonimizada do banco real;
4. criar baseline completa imutável;
5. alterar `ddl-auto` para `validate`;
6. provar boot vazio e upgrade no smoke local.

Não execute `repair`, `baseline` manual ou edição da tabela `flyway_schema_history` sem um plano de recuperação testado em cópia.

## Rollback

- Código: manter o artefato anterior de site, app e API de forma independente.
- Banco: migrations desta linha são aditivas; não apagar colunas durante rollback.
- Arquivos: preservar o volume e restaurar metadados e objetos como um único conjunto.
- Sessões: rollback que altere autenticação pode exigir revogação explícita.
- Offline: o app antigo não deve limpar outbox criada por versão nova; testar compatibilidade antes da promoção.

O rollback termina somente após smoke de autenticação, leitura, upload autorizado e isolamento entre workspaces.
