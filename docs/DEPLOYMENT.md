# Operação e publicação

Este documento descreve a configuração de publicação e os cuidados para liberações futuras. Os workflows do repositório apenas verificam código. A integração Git da Vercel publica a branch `production`, e a API aplica migrations ao iniciar.

Publicação inicial: [site público](https://angico-site.vercel.app) e [aplicativo](https://angico-app.vercel.app), na equipe Angico da Vercel, com banco e Storage na organização Angico do Supabase. A branch `production` parte de `dev` (`c82a9b9`), a linha mais avançada verificada na preparação do deploy; não havia uma branch `develop`.

## Vercel e Supabase

O `vercel.json` da raiz reúne a aplicação Vite e a API Java em Vercel Services, com Container Runtime para o Dockerfile da API. Ambos os recursos estão em beta. `/api/*` e `/health/*` chegam à API; as demais rotas chegam ao app, incluindo deep links. Os cookies continuam na mesma origem. Essa configuração dispensa `ANGICO_API_ORIGIN`; o proxy em `apps/app/api` permanece disponível para publicações independentes.

Crie dois projetos Vercel na equipe Angico, a partir do mesmo commit:

- Aplicação: Root Directory na raiz do repositório; use `vercel.json` para os serviços.
- Site público: Root Directory `apps/site`; configure `VITE_APP_URL` com a URL HTTPS definitiva da aplicação e publique após validar o app.

No projeto da aplicação, configure estas variáveis **somente no servidor** para Production. Não conecte previews ao banco de produção; use outro projeto Supabase para testes.

| Variável | Configuração |
| --- | --- |
| `SPRING_PROFILES_ACTIVE` | `prod` |
| `PORT` | `8082` |
| `JAVA_TOOL_OPTIONS` | `-XX:TieredStopAtLevel=1` para reduzir o tempo de partida da JVM no Container Runtime |
| `ANGICO_DB_URL` | URL JDBC do Session Pooler Supabase, porta `5432`, com `sslmode=require&currentSchema=angico`; sem senha na URL |
| `ANGICO_DB_USER` | Usuário exibido no Session Pooler (`postgres.<project-ref>`) |
| `ANGICO_DB_PASSWORD` | Senha do banco, configurada como segredo |
| `ANGICO_ALLOWED_ORIGINS` | Origem HTTPS exata da aplicação |
| `ANGICO_AUTH_REQUIRED` | `true` |
| `ANGICO_PUBLIC_REGISTRATION` | `false` |
| `ANGICO_COOKIE_SECURE` | `true` |
| `ANGICO_FLYWAY_ENABLED` | `true` |
| `SPRING_FLYWAY_DEFAULT_SCHEMA` | `angico` |
| `SPRING_FLYWAY_SCHEMAS` | `angico` |
| `SPRING_FLYWAY_BASELINE_ON_MIGRATE` | `false` para a instalação nova |
| `ANGICO_SEED_DEMO_LEADER` | `false` |
| `SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE` | `5` por instância; ajustar à capacidade do banco e à concorrência |
| `SPRING_DATASOURCE_HIKARI_MINIMUM_IDLE` | `0` |
| `ANGICO_UPLOAD_STORAGE` | `supabase` |
| `SUPABASE_URL` | Origem HTTPS do projeto Supabase |
| `SUPABASE_SECRET_KEY` | Chave `sb_secret_...` do projeto, configurada como segredo |
| `ANGICO_UPLOAD_BUCKET` | `angico-private` |
| `ANGICO_GEOCODER_USER_AGENT` | `Angico/0.1 timeangico@gmail.com` |

No Supabase da organização Angico, use um projeto novo e o esquema dedicado `angico`, criado automaticamente pelo Flyway. O esquema `public` do Supabase pode conter objetos da plataforma mesmo em um projeto novo: habilitar baseline automático nele pode pular `V0` e deixar as migrations seguintes sem as tabelas básicas. Não use o histórico parcial de `public` para a instalação nova; mantenha JDBC e Flyway apontando para `angico`, com baseline automático desativado. Não troque o esquema de uma instalação que já contenha dados sem um plano de migração.

Mantenha a Data API desativada: o backend usa JDBC e a autenticação já existente no Angico. Não exponha o esquema `angico` à Data API. Crie o bucket **privado** `angico-private`, com limite de `2097152` bytes e tipos `image/jpeg`, `image/png`, `image/webp`, `application/pdf`, `text/plain`. Não crie políticas públicas de leitura; downloads passam pela autorização do backend. A chave secreta acessa Storage pelo cabeçalho `apikey` e nunca entra no bundle do frontend.

Após configurar os segredos, a inicialização aplica as migrations. Verifique `/health/ready`, login, rejeição de acesso entre workspaces, envio e leitura de um anexo e releitura após reiniciar a API. O primeiro usuário precisa ser provisionado antes do teste de login; não habilite cadastro público apenas para contornar esse passo. Não considere um build bem-sucedido como validação da conexão ao banco ou do Storage.

O serviço pode ser reduzido a zero quando inativo. O cliente aguarda até 60 segundos para permitir a primeira inicialização da API; requisições posteriores normalmente reutilizam a instância ativa.

Referências: [Vercel Services](https://vercel.com/docs/services), [Container Runtime](https://vercel.com/docs/functions/runtimes/container), [Supabase com Spring Boot](https://supabase.com/docs/guides/getting-started/quickstarts/springboot), [chaves Supabase](https://supabase.com/docs/guides/api/api-keys).

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

Flyway aplica migrations específicas para H2 e PostgreSQL antes da criação do `EntityManagerFactory`. `V0` contém o schema integral para banco vazio; `V1` a `V6` permanecem aditivas e idempotentes. O perfil de produção usa `hibernate.ddl-auto=validate` e falha se o schema final divergir do modelo JPA.

Compatibilidade esperada:

1. banco vazio executa `V0` até `V6`;
2. banco não vazio sem histórico recebe baseline `0` e executa `V1` até `V6`;
3. banco com histórico `0` a `6` mantém o histórico e aceita `V0` como migration resolvida abaixo da versão atual.

Os três caminhos têm cobertura local em H2; o smoke PostgreSQL prova banco vazio e upgrade a partir de um ref anterior em container efêmero. Isso não substitui um ensaio de restauração e upgrade em uma cópia anonimizada antes de usar um banco persistente.

Não execute `repair`, `baseline` manual ou edição da tabela `flyway_schema_history` sem um plano de recuperação testado em cópia.

## Rollback

- Código: manter o artefato anterior de site, app e API de forma independente.
- Banco: migrations desta linha são aditivas; não apagar colunas durante rollback.
- Arquivos: preservar o volume e restaurar metadados e objetos como um único conjunto.
- Sessões: rollback que altere autenticação pode exigir revogação explícita.
- Offline: o app antigo não deve limpar outbox criada por versão nova; testar compatibilidade antes da promoção.

O rollback termina somente após smoke de autenticação, leitura, upload autorizado e isolamento entre workspaces.
