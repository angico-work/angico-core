# Separação dos repositórios

O Angico está organizado como monorepo, mas `apps/site`, `apps/app` e `apps/api` não compartilham código, dependências ou configuração de build. Cada pasta contém também um workflow standalone e pode ser extraída para um repositório próprio preservando o histórico dos arquivos que lhe pertencem.

## Estado atual

| Projeto | Pasta | Desenvolvimento | Build | Deployment |
| --- | --- | --- | --- | --- |
| Site público | `apps/site` | `npm run dev` | `npm run build` | Vercel ou host estático |
| Aplicação | `apps/app` | `npm run dev` | `npm run build` | Vercel com proxy server-side |
| API | `apps/api` | `mvn spring-boot:run` | `mvn clean package` | Container com PostgreSQL e volume persistente |

O site aponta para a aplicação por URL pública. A aplicação chama apenas `/api` na própria origem; em produção, a Function da aplicação encaminha as requisições para uma origem fixa configurada no servidor. A API não depende dos fontes dos frontends.

## Pré-requisitos

- trabalhar em clones descartáveis e limpos;
- confirmar que todos os commits desejados estão na branch de origem;
- criar um bundle de recuperação antes de reescrever qualquer clone;
- instalar `git-filter-repo`;
- criar os três repositórios remotos vazios, sem README inicial.

Exemplo de bundle:

```bash
git -C /caminho/angico-core bundle create /caminho/angico-core-before-split.bundle --all
git bundle verify /caminho/angico-core-before-split.bundle
```

## Extrair o site público

```bash
git clone https://github.com/angico-work/angico-core.git angico-web
cd angico-web
git switch feat/angico-rebuild
git filter-repo \
  --path apps/site/ \
  --path docs/DEPLOYMENT.md \
  --path docs/REPOSITORY_SPLIT.md \
  --path-rename apps/site/: \
  --force
git remote remove origin
git remote add origin https://github.com/angico-work/angico-web.git
git push -u origin HEAD:main
```

## Extrair a aplicação

```bash
git clone https://github.com/angico-work/angico-core.git angico-app
cd angico-app
git switch feat/angico-rebuild
git filter-repo \
  --path apps/app/ \
  --path docs/DEPLOYMENT.md \
  --path docs/OFFLINE_ARCHITECTURE.md \
  --path docs/SECURITY.md \
  --path docs/UNIQUE_FEATURE.md \
  --path-rename apps/app/: \
  --force
git remote remove origin
git remote add origin https://github.com/angico-work/angico-app.git
git push -u origin HEAD:main
```

## Extrair a API

```bash
git clone https://github.com/angico-work/angico-core.git angico-api
cd angico-api
git switch feat/angico-rebuild
git filter-repo \
  --path apps/api/ \
  --path docs/DEPLOYMENT.md \
  --path docs/ONTOLOGY.md \
  --path docs/SECURITY.md \
  --path docs/UNIQUE_FEATURE.md \
  --path-rename apps/api/: \
  --force
perl -pi -e 's#\.\./\.\./docs/#docs/#g' README.md
git remote remove origin
git remote add origin https://github.com/angico-work/angico-api.git
git push -u origin HEAD:main
```

O nome da branch acima deve ser substituído pelo commit ou tag efetivamente aprovado para release. Não execute `git filter-repo` no checkout de trabalho nem force-push o repositório atual como parte da extração.

## Validação após a extração

Depois do filtro, confirme que `.github/workflows/verify.yml`, `.gitignore`, `.env.example`, o README e os documentos selecionados existem na raiz extraída. Em cada repositório:

```bash
git status --short
git log --oneline --decorate -20
```

No site e na aplicação:

```bash
npm ci
npm test -- --run
npm run typecheck
npm run build
```

Na API:

```bash
mvn clean verify
scripts/smoke-prod-postgres.sh
docker build -t angico-api .
```

Também deve ser repetida a busca por segredos e arquivos locais antes do primeiro push de cada novo remoto. O bundle de recuperação deve permanecer fora dos repositórios.

## Ordem de migração

1. Publicar a API em preview com banco e storage isolados.
2. Publicar a aplicação apontando o proxy server-side para essa API.
3. Publicar o site com o endereço da aplicação validada.
4. Executar os fluxos de autenticação, autorização, registro offline, sincronização, mensagens e Rastro Verificável.
5. Promover os três componentes separadamente e manter a release anterior disponível para rollback.

Até a criação dos remotos independentes, este monorepo é a fonte canônica e cada pasta mantém seu pipeline próprio.
