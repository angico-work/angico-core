# Angico Site

Site público independente do Angico. O projeto apresenta a proposta do produto, encaminha visitantes para a aplicação operacional e envia o formulário de contato para um endpoint público configurado. Ele não importa rotas, tipos nem dependências privadas de `apps/app` ou `apps/api`.

## Desenvolvimento

```bash
npm ci
cp .env.example .env.local
npm run dev
```

O servidor local usa `http://localhost:5175`.

## Ambiente

- `VITE_APP_URL`: URL pública da aplicação operacional.
- `VITE_CONTACT_API_URL`: endpoint público que recebe o formulário de contato via `POST`.

Quando uma URL não está configurada, o site mostra o canal correspondente como temporariamente indisponível em vez de apontar para um destino implícito.

## Verificação

```bash
npm test -- --run
npm run build
```
