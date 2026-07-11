# Mutações de domínio offline

## Objetivo

Permitir que operações centrais de campo sejam registradas sem conexão e enviadas depois, sem criar IDs remotos fictícios, aceitar destinos arbitrários ou repetir efeitos no domínio.

Esta versão cobre:

- problema;
- potencialidade;
- missão;
- ação;
- resultado;
- indicador;
- medição;
- recurso;
- uso de recurso.

Organizações e participações permanecem fora deste contrato até que seus fluxos de interface tenham uma fronteira offline própria.

## Fronteira da API

A API publica uma rota fixa e tipada para cada operação sob `/api/offline/mutations`. O cliente escolhe somente entre as operações declaradas pelo contrato; nenhuma URL, método HTTP ou nome de serviço é recebido no payload.

Cada rota reutiliza o DTO validado e o serviço de domínio correspondente. O gateway deriva o ator da sessão, autoriza o workspace informado pelo DTO e executa, na mesma transação:

1. normalização da `Idempotency-Key`;
2. cálculo do hash canônico de operação, workspace e payload;
3. leitura ou reserva do registro idempotente;
4. validação das referências e criação pelo serviço de domínio;
5. conclusão do registro idempotente com o tipo e o ID do recurso.

Uma corrida pela mesma chave é recuperada em uma nova transação de leitura. O segundo pedido recebe o mesmo comprovante sem repetir a mutação. A mesma chave com outro payload retorna conflito.

## Comprovante de sincronização

Uma criação confirmada ou repetida retorna:

```json
{
  "operation": "PROBLEMA_CREATE",
  "workspaceId": "workspace-a",
  "clientMutationId": "chave-do-dispositivo",
  "resourceId": "42"
}
```

O aplicativo só aceita o comprovante quando:

- a operação coincide com o item da outbox;
- o workspace coincide com a partição local;
- `clientMutationId` coincide com a chave de idempotência;
- `resourceId` representa um inteiro remoto positivo.

Qualquer resposta diferente permanece como erro de sincronização; ela não transforma um item local em registro confirmado.

## Outbox local

A outbox usa uma união discriminada de operações e payloads. Cada item contém a partição `ownerId` e `workspaceId`, a chave idempotente, o corpo tipado e os campos de lease, tentativa e estado já usados pelas demais operações offline.

O sincronizador resolve a rota por um `switch` exaustivo definido no código. O item não armazena nem controla a URL de destino. As regras existentes continuam válidas:

- `401` bloqueia até uma sessão validada;
- `409` registra conflito;
- `400`, `403`, `404`, `413` e `422` exigem ação;
- falhas transitórias recebem backoff;
- troca de conta libera a lease sem aplicar a resposta;
- somente um comprovante válido marca o item como sincronizado.

## Causalidade

Relações podem apontar apenas para IDs positivos selecionados das leituras confirmadas do servidor. Uma entidade ainda pendente não pode ser usada como origem ou destino de outra operação. O aplicativo não cria mapeamentos, aliases ou IDs temporários para contornar essa regra.

## Estados da interface

Depois do envio do formulário, a interface informa somente um dos estados observados:

- sincronizado: a API devolveu um comprovante válido;
- salvo neste aparelho: o item permanece na outbox aguardando envio;
- precisa de atenção: a outbox registrou conflito, bloqueio ou erro permanente.

Itens locais não são inseridos em listas como se fossem entidades remotas. Uma confirmação imediata dispara nova leitura da lista; uma operação pendente continua visível pelo centro de sincronização.

## Verificação

Os testes da API cobrem criação, replay, chave reutilizada com payload diferente, isolamento por ator e workspace, referências inválidas, rollback e corrida pela chave única. Os testes do aplicativo cobrem persistência offline, reconexão, validação do comprovante, troca de conta, lease, `409`, `422` e textos de estado sem falso sucesso.
