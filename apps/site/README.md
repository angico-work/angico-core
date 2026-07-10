# Site público do Angico

Experiência pública independente que apresenta o Angico como memória operacional socioambiental e explica o percurso verificável entre território, ação, evidência e resultado. O site encaminha visitantes para a aplicação autenticada sem importar rotas, tipos ou dependências privadas dos outros produtos.

O formulário de contato só existe quando um endpoint público é configurado. O envio acontece sem sair da página, informa o estado da solicitação e preserva o conteúdo quando houver falha. Na ausência do destino, a interface informa a indisponibilidade em vez de simular um envio.

## Desenvolvimento

```bash
npm ci
cp .env.example .env.local
npm run dev
```

O servidor local usa `http://localhost:5175`.

## Ambiente

- `VITE_APP_URL`: URL pública da aplicação operacional.
- `VITE_CONTACT_API_URL`: endpoint público que recebe o formulário como `multipart/form-data` via `POST`.

Quando uma URL não está configurada, o site mostra o canal correspondente como temporariamente indisponível em vez de apontar para um destino implícito.

## Verificação

```bash
npm test -- --run
npm run typecheck
npm run build
```
