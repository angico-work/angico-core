# Angico

O Angico transforma trabalho socioambiental disperso em memória operacional verificável. O produto conecta território, pessoas, organizações, observações, missões, ações, evidências, resultados e medições sem inventar relações ausentes.

## Estrutura

```text
apps/site   site público editorial
apps/app    aplicação autenticada e offline-first
apps/api    API, autorização, domínio, memória e sincronização
docs        arquitetura, segurança e decisões de produto
```

Cada aplicação possui dependências, ambiente, testes e build próprios. Não existem imports entre os três diretórios.

## Execução local

Requisitos: Node.js 22, npm, JDK 25 e Maven. Docker é opcional e usado apenas pelo smoke de PostgreSQL efêmero.

### 1. API

```bash
cd apps/api
mvn spring-boot:run
```

A API inicia em `http://localhost:8082`. Autenticação é obrigatória, cadastro público e seed local ficam desligados por padrão. Para criar uma conta inicial somente no ambiente local, forneça uma senha própria ao seed explícito:

```bash
ANGICO_SEED_DEMO_LEADER=true \
ANGICO_SEED_DEMO_LEADER_PASSWORD='uma-senha-local-forte' \
mvn spring-boot:run
```

### 2. Aplicação

```bash
cd apps/app
npm ci
npm run dev
```

A aplicação inicia em `http://localhost:5176` e encaminha `/api` para `http://localhost:8082` no desenvolvimento.

### 3. Site

```bash
cd apps/site
npm ci
npm run dev
```

O site inicia em `http://localhost:5175`. Sem `VITE_APP_URL` ou `VITE_CONTACT_API_URL`, os respectivos canais aparecem como indisponíveis; nenhum envio é simulado.

## Verificação local

```bash
cd apps/site
npm ci
npx playwright install chromium
npm run verify
npm audit --audit-level=high

cd ../app
npm ci
npx playwright install chromium
npm run verify
npm audit --audit-level=high

cd ../api
mvn clean verify
scripts/smoke-prod-postgres.sh
docker build -t angico-api:local .
```

O smoke cria um PostgreSQL temporário no Docker local, valida as migrations e remove o container ao terminar. Ele não usa banco remoto.

Nos frontends, `npm run verify` reúne lint, typecheck, testes unitários, build, orçamento bruto de JavaScript/CSS e Playwright com Chromium. Os smokes cobrem 320, 375, 430 e 1440 px, movimento reduzido, teclado, overflow, console e violações axe sérias ou críticas. Fixtures de API existem apenas no diretório `e2e` do app e nunca entram no bundle de produção.

Os workflows da raiz executam esses gates no monorepo. Cada frontend também mantém um workflow em seu próprio `.github/workflows/verify.yml`, pronto para uso caso o diretório seja separado em um repositório independente.

## Princípios de dados

- Dados privados são particionados por pessoa e workspace.
- Mutações offline usam IDs locais e idempotência.
- Falha de sincronização nunca apaga o registro local.
- `occurredAt` preserva quando o trabalho aconteceu; `recordedAt` registra quando o servidor confirmou.
- Contagem operacional não é apresentada como impacto medido.
- O Rastro Verificável mostra relações existentes e lacunas objetivas, sem nota arbitrária.

## Documentação

- [Ontologia](docs/ONTOLOGY.md)
- [Arquitetura offline](docs/OFFLINE_ARCHITECTURE.md)
- [Rastro Verificável](docs/UNIQUE_FEATURE.md)
- [Segurança](docs/SECURITY.md)
- [Separação do repositório](docs/REPOSITORY_SPLIT.md)
- [Operação e publicação](docs/DEPLOYMENT.md)

Nenhum serviço de produção é provisionado ou publicado por este repositório durante a verificação local.
