# Plano de implementação da reconstrução

## Meta

Entregar site, aplicativo e API independentes, com autorização por workspace, uma única memória ontológica, operação offline real, mensagens contextuais e o MVP do Rastro Verificável.

## Arquitetura de execução

O trabalho será feito em fatias verticais. Cada tarefa termina com testes e build próprios. Mudanças de banco serão aditivas. Dados locais, assets da marca e alterações já presentes no checkout serão preservados.

## Restrições globais

- Site, app e API devem possuir configuração, dependências, ambiente, testes e deployment próprios.
- Textos visíveis devem permanecer em português do Brasil.
- Produção não pode usar credenciais, seeds ou dados de demonstração implícitos.
- Toda consulta privada deve derivar o workspace das associações do usuário.
- Mutações offline devem possuir UUID local e chave de idempotência.
- A API não pode apagar dados locais como efeito de falha de sincronização.
- Componentes devem funcionar por teclado, ter foco visível e respeitar redução de movimento.
- Código morto, comentários narrativos e duplicações devem ser removidos antes da entrega.

## Task 1 — Fronteiras independentes

**Arquivos**

- Mover: `apps/web` para `apps/app`
- Criar: `apps/site/package.json`
- Criar: `apps/site/package-lock.json`
- Criar: `apps/site/tsconfig.json`
- Criar: `apps/site/vite.config.ts`
- Criar: `apps/site/index.html`
- Criar: `apps/site/src/main.tsx`
- Criar: `apps/site/src/Site.tsx`
- Criar: `apps/site/src/Site.test.tsx`
- Criar: `apps/site/src/styles.css`
- Criar: `apps/site/.env.example`
- Criar: `apps/site/.gitignore`
- Criar: `apps/site/vercel.json`
- Criar: `apps/site/README.md`
- Modificar: `apps/app/package.json`
- Modificar: `apps/app/vite.config.ts`
- Modificar: `apps/app/index.html`
- Modificar: `apps/app/README.md`
- Modificar: `apps/api/README.md`
- Remover: `vite.config.js`

**Contrato**

- Site inicia em `5175` e usa apenas `VITE_APP_URL` e `VITE_CONTACT_API_URL`.
- App inicia em `5176` e usa `VITE_API_BASE_URL`.
- API inicia em `8082`.
- Nenhum import pode atravessar `apps/site`, `apps/app` ou `apps/api`.

**Verificação**

- `cd apps/site && npm test -- --run`
- `cd apps/site && npm ci && npm run build`
- `cd apps/app && npm ci && npm run build`
- `cd apps/api && mvn test`
- `rg -n "apps/(site|app|api)" apps/site/src apps/app/src` não deve encontrar import cruzado.

## Task 2 — Configuração e segurança fail-closed

**Arquivos**

- Modificar: `apps/api/src/main/resources/application.yml`
- Criar: `apps/api/src/main/resources/application-dev.yml`
- Criar: `apps/api/src/main/resources/application-prod.yml`
- Modificar: `apps/api/src/main/java/com/angico/auth/AuthInterceptor.java`
- Modificar: `apps/api/src/main/java/com/angico/auth/AuthService.java`
- Modificar: `apps/api/src/main/java/com/angico/auth/AuthController.java`
- Criar: `apps/api/src/main/java/com/angico/auth/AuthSession.java`
- Criar: `apps/api/src/main/java/com/angico/auth/AuthSessionRepository.java`
- Criar: `apps/api/src/main/java/com/angico/auth/CsrfProtectionInterceptor.java`
- Modificar: `apps/api/src/main/java/com/angico/common/DemoLeaderSeeder.java`
- Modificar: `apps/api/src/main/java/com/angico/workspaces/WorkspaceAccessService.java`
- Criar: `apps/api/src/main/java/com/angico/workspaces/WorkspaceAuthorizationService.java`
- Modificar: serviços e controllers que recebem `workspaceId`
- Modificar: `apps/app/src/lib/api.ts`
- Modificar: `apps/app/src/pages/LoginPage.tsx`
- Criar: `apps/api/src/main/resources/db/migration/V1__session_and_identity_constraints.sql`
- Criar: testes HTTP e de isolamento em `apps/api/src/test/java/com/angico/security`

**Interfaces**

```java
public final class WorkspaceAuthorizationService {
    void requireMember(String workspaceId);
    void requireRole(String workspaceId, Set<String> roles);
    String requireAuthorizedWorkspace(String requestedWorkspaceId);
}
```

```ts
export interface AuthSession {
  pessoaId: number;
  nome: string;
  email: string | null;
  angicoId: string | null;
  papel: string | null;
  workspaceId: string | null;
  expiresAt: string;
  csrfToken: string;
}
```

**Comportamento**

- Autenticação obrigatória por padrão.
- Seed de demonstração desligado por padrão e sem senha fixa no código.
- Cadastro público fica desligado por padrão; quando habilitado, cria workspace isolado e associação `OWNER`, nunca acesso ao workspace existente.
- Sessão possui expiração e endpoint de revalidação.
- Cookie de sessão usa `HttpOnly`, `Secure` em produção e `SameSite=Lax`; mutações autenticadas por cookie exigem token CSRF associado à sessão.
- A migration cria sessões e índices únicos de email e Angico ID sem remover registros existentes.
- `401`, `403` e erros de validação retornam contratos distintos.
- Conversas e anexos exigem participação ou papel administrativo.

**Testes**

- Usuário não autenticado recebe `401` em endpoint privado.
- Membro do workspace A recebe `403` ao consultar ou mutar workspace B.
- Usuário fora de conversa recebe `403` ao ler mensagens e anexos.
- Variável de seed ausente não cria conta de demonstração.
- Payload inválido recebe `400`, não `500`.

## Task 3 — Uma única memória operacional

**Arquivos**

- Modificar: `apps/api/src/main/java/com/angico/core/memory/MemoryQueryService.java`
- Modificar: `apps/api/src/main/java/com/angico/core/memory/JpaMemoryGateway.java`
- Modificar: `apps/api/src/main/java/com/angico/core/memory/StoredMemoryEvent.java`
- Modificar: `apps/api/src/main/java/com/angico/core/memory/StoredMemoryRelation.java`
- Modificar: `apps/api/src/main/java/com/angico/core/ontology/OntologyService.java`
- Remover: entidades, repositories e gateway duplicados `Core*` e `LoggingMemoryGateway`
- Modificar: publishers de domínio para vocabulário canônico
- Criar: testes em `apps/api/src/test/java/com/angico/core/memory`

**Interfaces**

```java
public record MemoryQuery(
        String workspaceId,
        String entityType,
        String entityId,
        Instant from,
        Instant to,
        String eventType,
        String actorId,
        String source,
        String syncStatus
) {}
```

**Comportamento**

- Gravação valida tipos e relações antes de persistir.
- Timeline e grafo leem `memory_event`, `memory_object` e `memory_relation`.
- Eventos passam a expor `recordedAt`, `organizationId`, `idempotencyKey`, estados anterior/novo, evidências e status de sync quando aplicável.
- Relações preservam autoria, contexto, fonte, confiança e intervalo temporal.

**Testes**

- Evento criado aparece na timeline do workspace e da entidade.
- Relação criada aparece no grafo.
- Relação inválida aborta a transação.
- Filtros de período, ator, origem e sync retornam apenas eventos autorizados.

## Task 4 — IndexedDB, outbox e sincronização

**Arquivos**

- Criar: `apps/app/src/offline/database.ts`
- Criar: `apps/app/src/offline/outbox.ts`
- Criar: `apps/app/src/offline/syncEngine.ts`
- Criar: `apps/app/src/offline/types.ts`
- Criar: `apps/app/src/offline/useSyncState.ts`
- Criar: `apps/app/src/components/SyncCenter.tsx`
- Modificar: `apps/app/src/components/Topbar.tsx`
- Modificar: `apps/app/public/sw.js`
- Modificar: `apps/app/src/lib/api.ts`
- Criar: `apps/api/src/main/java/com/angico/core/sync/IdempotencyRecord.java`
- Criar: `apps/api/src/main/java/com/angico/core/sync/IdempotencyService.java`
- Modificar: endpoints offline de observação e evidência; mensagens reutilizam o contrato na Task 5

**Interfaces**

```ts
export type SyncStatus =
  | 'QUEUED'
  | 'SYNCING'
  | 'SYNCED'
  | 'RETRYABLE_ERROR'
  | 'CONFLICT'
  | 'BLOCKED'
  | 'ACTION_REQUIRED';

export interface OutboxItem {
  id: string;
  ownerId: number;
  workspaceId: string;
  kind: 'observation.create' | 'evidence.create' | 'message.send';
  localEntityId: string;
  payload: unknown;
  idempotencyKey: string;
  deviceId: string;
  occurredAt: string;
  dependsOn: string[];
  attempts: number;
  nextAttemptAt: string;
  status: SyncStatus;
  leaseUntil: string | null;
  error: SyncError | null;
  serverResult: { resourceId: string } | null;
}
```

**Comportamento**

- Service worker armazena somente shell e assets públicos.
- Dados privados ficam em IndexedDB particionado por usuário e workspace.
- Entidade local e item de outbox são persistidos na mesma transação antes de a UI confirmar salvamento local.
- Outbox usa operações conhecidas, preserva ordem causal, lease, retry exponencial e erro permanente; não armazena URLs arbitrárias.
- `navigator.onLine` é somente um gatilho. O estado sincronizado exige confirmação e reconciliação persistidas.
- `401` bloqueia a fila sem apagá-la; `409` preserva o conflito; `400`, `403`, `404`, `413` e `422` exigem ação explícita.
- Logout apaga cache, outbox, rascunhos e blobs do usuário.
- `409` permanece visível até resolução explícita.

**Testes**

- Operação criada offline permanece após reload.
- Reconexão envia uma vez mesmo com retry.
- Dependência bloqueia item filho até o pai sincronizar.
- Logout de A impede B de ler cache de A.
- Falha não remove payload nem anexo.

## Task 5 — Mensagens contextuais

**Arquivos**

- Modificar: `apps/api/src/main/java/com/angico/mensagens/Conversa.java`
- Modificar: `apps/api/src/main/java/com/angico/mensagens/Mensagem.java`
- Modificar: `apps/api/src/main/java/com/angico/mensagens/MensagemService.java`
- Modificar: `apps/api/src/main/java/com/angico/mensagens/MensagemController.java`
- Criar: `apps/api/src/main/java/com/angico/mensagens/MessageReadReceipt.java`
- Modificar: `apps/app/src/pages/MensagensPage.tsx`
- Criar: `apps/app/src/messages/messageDrafts.ts`

**Contrato**

- Conversa aceita `contextEntityType` e `contextEntityId` validados.
- Mensagem aceita `clientMessageId`, estado de envio e anexos autorizados.
- Rascunho e mensagem enfileirada funcionam offline.
- Busca cobre título, corpo, autor e contexto.
- A interface atualiza por polling com backoff; não declara entrega ou leitura sem recibo real.

**Testes**

- Participante envia e lê; não participante recebe `403`.
- Reenvio com o mesmo `clientMessageId` retorna a mensagem original.
- Mensagem ligada a um objeto operacional aparece na timeline desse objeto.
- Rascunho persiste offline e é removido somente após confirmação.

## Task 6 — Rastro Verificável

**Arquivos**

- Criar: `apps/api/src/main/java/com/angico/rastro/RastroService.java`
- Criar: `apps/api/src/main/java/com/angico/rastro/RastroController.java`
- Criar: `apps/api/src/main/java/com/angico/rastro/RastroResponse.java`
- Criar: `apps/api/src/main/java/com/angico/rastro/RastroLacuna.java`
- Criar: `apps/api/src/test/java/com/angico/rastro/RastroServiceTest.java`
- Criar: `apps/app/src/pages/RastroPage.tsx`
- Criar: `apps/app/src/components/RastroTimeline.tsx`
- Criar: `apps/app/src/components/RastroLacunas.tsx`
- Criar: `apps/app/src/domain/rastroRules.ts`
- Modificar: `apps/app/src/App.tsx`
- Modificar: `apps/app/src/components/Sidebar.tsx`

**Interfaces**

```java
public record RastroResponse(
        String workspaceId,
        String rootType,
        String rootId,
        List<RastroNode> percurso,
        List<RastroRelation> relacoes,
        List<RastroLacuna> lacunas
) {}
```

```ts
export interface RastroLacuna {
  code: string;
  title: string;
  reason: string;
  nextAction: string;
  targetType: string;
}
```

**Regras**

- Não existe nota ou percentual arbitrário.
- O Rastro é um read model sobre `memory_object`, `memory_relation` e `memory_event`; não duplica eventos ou entidades de domínio.
- O percurso parte de território, missão ou ação e atravessa somente relações ontológicas válidas.
- Cada lacuna deriva de relação, autoria, evidência, resultado ou medição ausente.
- Pessoas, organizações e recursos aparecem no ponto do percurso em que participaram.
- Eventos preservam ordem ocorrida, ordem gravada e estado de sincronização.
- Uma mutação offline usa UUID estável e não duplica após retry.
- Conversas e evidências ligadas ao objeto aparecem no mesmo percurso.

**Testes**

- Ação sem território, autoria, evidência ou resultado informa cada lacuna de forma independente.
- Adicionar uma relação fecha somente a lacuna correspondente.
- Resultado sem evidência continua explicitamente não comprovado.
- Medição sem indicador válido não aparece como impacto comprovado.
- Ordem ocorrida permanece correta após sync fora de ordem.
- O endpoint não cria nenhum objeto, relação ou evento ao consultar o rastro.
- Usuário sem acesso ao workspace recebe `403`.

## Task 7 — Site público e refinamento do app

**Arquivos**

- Implementar componentes do site em `apps/site/src/components`
- Implementar tokens em `apps/site/src/styles.css` e `apps/app/src/styles.css`
- Modificar páginas do app para estados explícitos e histórico navegável
- Criar testes de site e app com Vitest
- Criar smoke e2e em `e2e`

**Direção**

- Site editorial com o percurso verificável de uma ação real como visualização central.
- App com densidade de caderno de campo, sem mosaico repetitivo de cards.
- Outfit, Source Sans 3 e Spline Sans Mono com fallback local seguro.
- Paleta e contraste definidos no plano de reconstrução.
- Motion restrito a transições de estado.

**Verificação visual**

- Viewports: `320`, `375`, `430`, `768`, `1024`, `1440`, `1920`.
- Sem overflow horizontal.
- Menu, formulários, timelines e modais utilizáveis por teclado.
- `prefers-reduced-motion` remove animação não essencial.
- Nenhum erro de console ou request inesperado.

## Task 8 — Release, documentação e limpeza

**Arquivos**

- Criar: `docs/ONTOLOGY.md`
- Criar: `docs/OFFLINE_ARCHITECTURE.md`
- Criar: `docs/UNIQUE_FEATURE.md`
- Criar: `docs/SECURITY.md`
- Criar: `docs/DEPLOYMENT.md`
- Criar: `docs/REPOSITORY_SPLIT.md`
- Criar: `.github/workflows/site.yml`
- Criar: `.github/workflows/app.yml`
- Criar: `.github/workflows/api.yml`
- Modificar: `.gitignore`
- Modificar: `render.yaml`
- Criar: `README.md`

**Verificação final**

- `cd apps/site && npm ci && npm run check && npm run build && npm audit --audit-level=high`
- `cd apps/app && npm ci && npm run check && npm run build && npm audit --audit-level=high`
- `cd apps/api && mvn clean verify`
- `docker build apps/api`
- Smoke HTTP de `/health`, autenticação, isolamento, outbox, mensagens e rastro.
- Browser em todas as larguras definidas.
- Busca por credenciais, dados fictícios, comentários narrativos, código morto e referências indevidas.
- `git diff --check`
- Histórico da branch ativa sem trailers ou mensagens de ferramentas de geração.
