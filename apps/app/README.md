# Angico App

Aplicação operacional privada do Angico, preservada a partir do frontend React existente. Este projeto possui dependências, ambiente e build próprios e não importa código do site público nem da API.

## Desenvolvimento

```bash
npm ci
npm run dev
```

O servidor local usa `http://localhost:5176`. A API local usa `http://localhost:8082`.

Copie `.env.example` para `.env.local`. Um `VITE_API_BASE_URL` vazio mantém as chamadas em `/api`; o proxy local as encaminha para `http://localhost:8082`. O override é aceito somente em desenvolvimento.

## Deploy na Vercel

O navegador sempre chama `/api` na mesma origem do app. A Function catch-all em `api/[...path].ts` encaminha método, query, corpo, cookie de sessão, token CSRF, status e `Set-Cookie` para uma origem fixa. Configure na Vercel apenas a variável server-side:

```text
ANGICO_API_ORIGIN=https://sua-api-render.example
```

O valor deve ser uma origem `http` ou `https`, sem caminho, query, credenciais ou fragmento. Ele não usa o prefixo `VITE_` e, portanto, não entra no bundle do navegador. Não configure `VITE_API_BASE_URL` em produção: o proxy same-origin é necessário para o cookie `SameSite=Lax`.

## Verificação

```bash
npm test -- --run
npm run typecheck
npm run build
```
