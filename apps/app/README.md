# Angico App

Aplicação operacional privada do Angico, preservada a partir do frontend React existente. Este projeto possui dependências, ambiente e build próprios e não importa código do site público nem da API.

## Desenvolvimento

```bash
npm ci
npm run dev
```

O servidor local usa `http://localhost:5176`. A API local usa `http://localhost:8082`.

Copie `.env.example` para `.env.local`. O navegador sempre chama `/api`; o proxy local encaminha para `VITE_DEV_API_PROXY_TARGET`, que usa `http://localhost:8082` por padrão.

## Deploy na Vercel

O navegador sempre chama `/api` na mesma origem do app. A Function catch-all em `api/[...path].ts` encaminha método, query, corpo, cookie de sessão, token CSRF, status e `Set-Cookie` para uma origem fixa. Configure na Vercel apenas a variável server-side:

```text
ANGICO_API_ORIGIN=https://sua-api-render.example
```

O valor deve ser uma origem `https`, sem caminho, query, credenciais ou fragmento. `http` é aceito somente para loopback local. Ele não usa o prefixo `VITE_` e, portanto, não entra no bundle do navegador. Não crie uma URL de API client-side em produção: o proxy same-origin é necessário para o cookie `SameSite=Lax`. Configure também `ANGICO_ALLOWED_ORIGINS` na API com a origem pública da aplicação Vercel; o proxy preserva o cabeçalho `Origin` do navegador.

## Verificação

Na primeira execução, instale o Chromium controlado pelo Playwright:

```bash
npx playwright install chromium
npm run verify
npm audit --audit-level=high
```

`npm run verify` executa lint sem warnings, typecheck, testes unitários, testes do orçamento, build, smoke responsivo em 320, 375, 430 e 1440 px, axe e conferência do bundle. O smoke autentica com respostas explícitas definidas em `e2e/api-fixtures.ts`, interceptadas somente pelo Playwright; nenhum mock é importado pelo código da aplicação.

Os limites brutos atuais são 680.000 bytes de JavaScript e 68.000 bytes de CSS. O workflow em `.github/workflows/verify.yml` permite repetir os mesmos gates quando este diretório for separado em um repositório próprio.
