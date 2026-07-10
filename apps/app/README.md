# Angico App

Aplicação operacional privada do Angico, preservada a partir do frontend React existente. Este projeto possui dependências, ambiente e build próprios e não importa código do site público nem da API.

## Desenvolvimento

```bash
npm ci
npm run dev
```

O servidor local usa `http://localhost:5176`. A API local usa `http://localhost:8082`.

Copie `.env.example` para `.env.local` e configure `VITE_API_BASE_URL` quando a API estiver em outra origem. Um valor vazio mantém as chamadas em `/api` e o proxy local as encaminha para a API na porta `8082`.

## Verificação

```bash
npm run typecheck
npm run build
```
