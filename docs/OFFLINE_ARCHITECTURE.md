# Arquitetura offline-first

## Escopo

O Angico mantém o trabalho essencial disponível quando a conexão falha sem tratar cache como fonte canônica nem esconder respostas do servidor. O navegador pode abrir o app, consultar a última cópia autorizada, registrar observações, escrever mensagens e guardar evidências com arquivo. A API continua sendo a autoridade sobre permissões, referências e estado confirmado.

O funcionamento local possui três camadas distintas:

1. o service worker preserva o shell e todos os chunks do aplicativo;
2. snapshots preservam respostas privadas já autorizadas;
3. a outbox preserva mutações e arquivos até uma resposta confirmada.

Nenhuma resposta privada de `/api` entra no cache do service worker.

## Partição de dados

Todo registro local privado pertence a:

```text
ownerId + workspaceId
```

`ownerId` é um alias local estável associado ao `pessoaId`. Na primeira execução da versão atual ele preserva a chave usada anteriormente, como o `angicoId`, para manter compatibilidade com dados da versão 3. Se a pessoa alterar seu identificador público depois disso, o alias local não muda.

O workspace permanece na chave de cada store e nos índices utilizados pelas consultas. Trocar de workspace não combina listas, mensagens, arquivos, snapshots ou itens da outbox.

## IndexedDB

Banco: `angico-operational-data`  
Versão: `4`

| Store | Finalidade |
| --- | --- |
| `outbox` | operações pendentes, tentativas, lease e estado de sincronização |
| `entities` | observações locais e sua confirmação remota |
| `messages` | mensagens locais, anexos e resposta confirmada |
| `evidences` | evidências locais, arquivo associado e resposta confirmada |
| `conversations` | cópia autorizada das conversas do workspace |
| `drafts` | rascunhos locais, atualmente de mensagens |
| `blobs` | bytes de anexos e evidências ainda necessários |
| `syncMeta` | última tentativa e última confirmação por partição |
| `snapshots` | respostas de leitura validadas e versionadas |

A migração de v3 para v4 é aditiva: cria `evidences` e `snapshots` sem recriar ou apagar as stores anteriores. Pendências, rascunhos e blobs existentes permanecem disponíveis.

## Outbox

Operações atuais:

- `CREATE_OBSERVATION`;
- `MESSAGE_SEND`;
- `EVIDENCE_CREATE`.

Cada operação recebe no aparelho:

- identificador UUID;
- workspace e proprietário;
- momento de criação e atualização;
- próxima tentativa;
- contador de tentativas;
- lease curto durante o envio;
- chave de idempotência enviada à API;
- referência para o registro local;
- estado e último erro.

Estados:

| Estado | Significado |
| --- | --- |
| `QUEUED` | pronto para tentativa |
| `SYNCING` | lease de envio ativo |
| `SYNCED` | resposta remota confirmada |
| `RETRYABLE_ERROR` | falha temporária; haverá nova tentativa |
| `CONFLICT` | a API rejeitou a repetição ou o estado concorrente |
| `BLOCKED` | sessão ausente ou revogada |
| `ACTION_REQUIRED` | payload, referência ou arquivo precisa de correção humana |
| `SUPERSEDED` | substituído por uma revisão posterior |
| `DISCARDED` | descarte explícito confirmado pela pessoa |

Uma falha nunca remove a operação. O lease permite recuperar uma tentativa interrompida sem manter o item preso em `SYNCING`. O retry usa backoff limitado e respeita a mesma ordem retornada pela store.

## Evidências e anexos

Uma evidência offline só pode apontar para um objeto que já possui ID remoto numérico. Essa restrição impede criar localmente uma relação para um objeto cuja identidade ainda não foi confirmada.

Ao salvar uma evidência com arquivo, a mesma transação IndexedDB grava:

1. o registro local;
2. a operação da outbox;
3. os bytes e metadados do arquivo.

Se qualquer parte falhar, nada é confirmado. O arquivo permanece em `blobs` depois de falha de rede, erro HTTP, conflito ou resposta incompleta. Ele só é removido quando:

- a API responde `201` com ID, workspace, sujeito e `clientMutationId` correspondentes; ou
- a pessoa descarta explicitamente o registro em um estado revisável.

Mensagens seguem a mesma regra de retenção para anexos. Arquivos são validados no cliente para resposta rápida e novamente na API, que continua sendo a validação definitiva.

## Snapshots de leitura

Um snapshot é identificado por:

```text
ownerId + workspaceId + resource + query + root + contractVersion
```

`query` é ordenada antes de formar a chave. `root` diferencia leituras compostas, como um Rastro iniciado em objetos distintos. `contractVersion` impede que uma versão nova consuma silenciosamente um payload antigo incompatível.

Cada snapshot guarda `savedAt` e o payload que passou pelo validador do recurso. A interface deve mostrar quando está usando uma cópia local e quando ela foi salva.

Recursos permitidos incluem conta e workspaces, painel, mapa, memória, territórios, módulos operacionais, evidências, resultados, impacto, organizações, recursos, conversas e Rastro.

Não são armazenados como snapshot:

- login, logout ou revalidação;
- geocodificação;
- buscas livres de pessoas ou mensagens;
- download de anexos;
- qualquer mutação.

## Política de fallback

O snapshot só pode substituir uma leitura remota em duas situações:

1. `navigator.onLine` informa ausência de conexão antes da tentativa;
2. `fetch` falha com um erro de transporte classificado como `ApiNetworkError`.

O app não usa snapshot para:

- `401`, `403`, `404`, `409`, `422` ou `5xx`;
- JSON inválido;
- payload que não passa pelo validador do contrato;
- requisição abortada;
- erro de programação.

Essas falhas precisam permanecer visíveis porque podem representar revogação, isolamento, mudança de contrato ou problema do servidor. Um snapshot anterior nunca deve transformar uma negação atual em sucesso aparente.

## Sessão offline

A sessão offline vence no primeiro destes limites:

- expiração definida pelo servidor;
- sete dias depois da última revalidação bem-sucedida.

O app reavalia esse limite ao iniciar, em intervalos curtos, ao recuperar foco, ao mudar a visibilidade e quando a rede retorna. A sincronização exige:

- sessão ainda válida;
- lease offline ainda válido;
- proprietário ativo igual ao proprietário da partição.

Ao vencer, novas sincronizações e leituras privadas ficam bloqueadas até nova autenticação. A outbox e os arquivos não são apagados.

## Logout e dados compartilhados

Antes do logout, o app verifica se a partição ativa contém pendências, conflitos, rascunhos ou arquivos. A limpeza local exige confirmação explícita e afeta somente o proprietário ativo. Cancelar o logout preserva sessão e dados.

Encerrar a sessão não autoriza apagar partições de outra pessoa que já tenha usado o aparelho. Em dispositivo compartilhado, cada pessoa precisa encerrar e remover apenas seus próprios dados.

## Service worker

O build produz `asset-manifest.json`. Durante a instalação, o service worker percorre as entradas, imports estáticos, imports dinâmicos e folhas de estilo locais; todos os chunks necessários são adicionados ao cache do shell.

Políticas:

- navegação: rede primeiro, com fallback para `index.html`;
- JS e CSS próprios: stale-while-revalidate;
- `/api`: rede obrigatória com `cache: no-store`;
- recursos externos: não são administrados pelo worker;
- nova versão: cache versionado e remoção dos caches anteriores na ativação.

Essa estratégia permite dividir as páginas em chunks sem exigir que a pessoa abra cada rota antes de ficar offline.

## Conflitos e recuperação

- `409` permanece como conflito e não é reenviado automaticamente em loop.
- `400`, `403`, `404`, `413` e `422` exigem ação humana.
- `401` bloqueia a sequência e exige nova autenticação.
- falhas temporárias mantêm dados e próxima tentativa.
- observações podem ser revisadas sem sobrescrever silenciosamente o registro anterior;
- mensagens com falha podem voltar a rascunho com seus anexos;
- evidências inválidas podem ser revisadas ou descartadas no centro de sincronização.

O cliente não cria uma relação, muda um ID ou resolve um conflito por inferência.

## Limites conhecidos

- IndexedDB não oferece criptografia própria; a proteção do dispositivo continua necessária.
- Uma revogação ocorrida durante ausência total de rede só é conhecida na próxima comunicação.
- A primeira versão não cria evidência contra um objeto que também está apenas na outbox.
- A outbox cobre as operações de campo implementadas; novos módulos precisam declarar seu contrato e idempotência antes de entrar.
- Compressão de imagem não é aplicada automaticamente; o limite atual prioriza integridade e previsibilidade.

## Verificação

Os testes locais cobrem:

- migração v3 para v4;
- isolamento entre pessoas e workspaces;
- persistência após fechar e reabrir o banco;
- atomicidade entre evidência, operação e blob;
- retenção do blob em falhas;
- remoção apenas após confirmação válida;
- lease vencido e retry;
- alias estável depois de alterar o identificador público;
- sessão offline expirada sem perda do snapshot;
- fallback de rede e rejeição de HTTP, parse e aborto;
- precache de todos os chunks JS/CSS do manifesto;
- exclusão de `/api` do cache do service worker.

