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

Na primeira execução, instale o Chromium controlado pelo Playwright:

```bash
npx playwright install chromium
npm run verify
npm audit --audit-level=high
```

`npm run verify` executa lint sem warnings, typecheck, testes unitários, testes do orçamento, build, smoke responsivo em 320, 375, 430 e 1440 px, axe e conferência do bundle. O teste de contato intercepta o endpoint somente dentro do Playwright; o site publicado não recebe fixtures nem respostas simuladas.

Os limites brutos atuais são 225.000 bytes de JavaScript e 16.000 bytes de CSS. O workflow em `.github/workflows/verify.yml` permite repetir os mesmos gates quando este diretório for separado em um repositório próprio.
