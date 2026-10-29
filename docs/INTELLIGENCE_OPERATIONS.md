# Operação da inteligência com contexto

A integração usa a Responses API da OpenAI a partir da API Java. O modelo recebe um relato, fontes autorizadas e até três exemplos de categorias revisadas. Isso é recuperação de contexto e inferência, sem treinamento próprio ou reinforcement learning.

## Ativação

A funcionalidade inicia desativada. No projeto **angico-app**, equipe **Angico**, configure o ambiente que executa o serviço Java em [Environment Variables](https://vercel.com/angico/angico-app/settings/environment-variables):

| Variável | Valor / finalidade |
|---|---|
| `OPENAI_API_KEY` | Chave de projeto OpenAI, tipo Secret, somente servidor. Não usar prefixo `VITE_` ou inserir em código/chat. |
| `OPENAI_MODEL` | ID de modelo habilitado nessa conta e compatível com Responses + Structured Outputs. Sem padrão implícito. |
| `ANGICO_INTELLIGENCE_ENABLED` | `true` após configurar os itens anteriores; `false` desativa novas análises. |
| `ANGICO_INTELLIGENCE_WORKSPACE_DAILY_CAP` | Máximo de solicitações por workspace por dia UTC; padrão `100`. `0` também desativa. |

Use credenciais e dados separados em Preview. Faça novo deploy após alterações de ambiente. O endpoint autenticado `GET /api/intelligence/status?workspaceId=...` informa disponibilidade de configuração, sem retornar chave. Ele não comprova crédito, permissão do modelo ou conectividade com OpenAI.

Antes de ativar em produção, confira o modelo na [documentação oficial](https://developers.openai.com/api/docs/models), configure um orçamento no projeto OpenAI e realize o teste sintético abaixo. A assinatura do ChatGPT e a configuração de uma chave Supabase não configuram esta integração.

## Contrato e limites

- A pessoa solicita a análise explicitamente. Nenhum evento de captura chama o provedor automaticamente.
- Acesso de escrita no workspace é obrigatório. Sessão e CSRF existentes protegem análise e feedback; o backend revalida acesso antes da chamada e antes de devolver o resultado.
- A busca seleciona até 50 registros recentes de cada um dos quatro tipos operacionais, ordenados por criação. Compara palavras normalizadas e envia até 20 fontes, cada trecho com até 1.000 caracteres. Pode perder correspondências antigas ou sem palavras em comum.
- O contexto inclui título e descrição de observações, problemas, ações e resultados. Não consulta pessoas, contatos estruturados, conversas privadas ou anexos. E-mails e números semelhantes a telefones são mascarados no texto livre; essa heurística não é anonimização completa. A tela pede que o autor evite dados pessoais.
- Chamada fixa para `https://api.openai.com/v1/responses`, `store:false`, timeout de 20 segundos, limite de 1.800 tokens de saída e sem retentativas da aplicação. `store:false` não substitui os controles de retenção da conta do provedor.
- Máximo de 5 reservas por pessoa em 10 minutos, somando workspaces; limite diário por workspace é configurável. Linhas de pessoa e workspace são travadas brevemente para tornar as reservas atômicas entre instâncias. Nenhuma trava permanece durante HTTP.
- Tentativas com falha também contam. Repetir o mesmo `requestId` com o mesmo conteúdo devolve a reserva existente; conteúdo diferente dá conflito. Uma chamada em andamento retorna `PENDING`, sem novo gasto. Reservas interrompidas por mais de 120 segundos retornam falha; uma nova chamada exige nova ação explícita.
- Saída: categoria opcional, resumo do relato, até três conexões e três recomendações. Referências desconhecidas, campos extras, tipos errados, relações incompatíveis, recusas e saída incompleta são rejeitados. Citação válida identifica a fonte; não comprova que a interpretação seja verdadeira.
- Resumo e sugestões são interpretações geradas. Aplicar categoria modifica somente o rascunho. Marcar uma conexão como útil grava revisão, sem criar relações canônicas ou salvar o registro.
- A correção humana permanece separada da saída original. Até três exemplos de categoria, relevantes e do mesmo workspace, podem entrar em análises seguintes. Rejeições não viram exemplos positivos. Uma sugestão recebe uma decisão imutável por análise; uma nova análise permite nova revisão.

## Falhas e desativação

Sem chave/modelo, retorna `UNAVAILABLE`; cota esgotada, `RATE_LIMITED`; resposta inválida/timeout, `FAILED`. Esses estados não alteram o fluxo de captura e sincronização offline. A sugestão de categoria local continua disponível e é identificada como local.

O frontend cancela e remove o resultado ao editar o texto, trocar tipo/workspace ou perder acesso. Cancelar no navegador não garante cancelar uma chamada já enviada ao provedor. Retentativas após perda de conexão mantêm o mesmo `requestId`. A revisão com falha oferece reenvio e não desfaz a categoria escolhida no rascunho.

Para interromper chamadas: configure `ANGICO_INTELLIGENCE_ENABLED=false` e publique novamente. Não reverta ou apague migrations aplicadas. As migrations V7/V8 são aditivas e compatíveis com o aplicativo anterior.

## Proveniência, retenção e métricas

`intelligence_analysis` guarda workspace, autor, hash de entrada, texto mascarado, fontes consultadas, modelo retornado, versão de prompt, saída validada, status, tokens e horários. `intelligence_feedback` guarda decisão e correção em separado. Tokens retornados em recusas e respostas incompletas também são preservados. Quando o provedor não informa consumo (por exemplo, timeout), os campos ficam `NULL`, não zero; reporte a quantidade de chamadas com consumo desconhecido junto dos totais conhecidos. A API não registra a chave nem respostas brutas de erro do provedor nos logs.

Nesta entrega não há expurgo agendado: os registros permanecem até exclusão administrativa. Antes de uso com dados reais, defina prazo conforme a política do workspace e inclua as duas tabelas na rotina de exclusão/exportação. Para expurgo, remova primeiro feedback associado e depois análises antigas, em transação; mantenha ao menos o dia UTC atual para não reiniciar as cotas. No PostgreSQL, a FK também elimina feedback quando a análise é removida. Backups e retenção do provedor são controles separados.

Métricas a acompanhar por versão de modelo/prompt, sem registrar textos em telemetria:

| Métrica | Cálculo e limite da interpretação |
|---|---|
| Correção de extração | Categorias que coincidem com avaliação humana independente / casos avaliados. Separar negações, ambiguidades e evidência insuficiente. |
| Validade das citações | IDs de fontes autorizadas e existentes / IDs citados; validação de suporte factual exige revisão humana adicional. |
| Taxa de correção | Feedback `corrected` de categoria / (`accepted` + `corrected`); publicar rejeições e cobertura de revisão separadamente. |
| Abstenção | Análises READY com categoria null / análises READY; verificar se a abstenção ocorreu quando necessário. |
| Falha, latência e consumo | Status por reserva, duração até conclusão, soma de input/output tokens; custos dependem do modelo e da tabela de preços vigente. |

O conjunto inicial em `apps/api/src/test/resources/intelligence/evaluation-cases.json` contém seis situações **sintéticas**: negação, endereço ambíguo, evidência insuficiente, repetição, contradição e isolamento. Os testes automatizados validam contratos e isolamento com provedor simulado. Não medem acurácia de campo nem a resistência semântica do modelo a prompt injection. Extração, correção e abstenção reais ainda dependem da execução com modelo e revisão humana.

## Teste sintético de ativação

1. Entre com uma conta de teste em um workspace exclusivo. Crie uma observação sintética, identificada como teste, sobre coleta de resíduos.
2. Abra um novo registro sintético semelhante, clique em **Analisar com IA** e confirme `READY`, categoria, resumo atribuído ao relato e fontes pertencentes ao workspace de teste. Em workspace vazio, ausência de conexões é comportamento válido.
3. Abra uma fonte e confira o registro. Aplique ou corrija a categoria; confirme que urgência e dados salvos não mudaram automaticamente.
4. Confira um registro de análise, modelo, versão de prompt e tokens no banco. Repita a mesma requisição com o mesmo ID e confirme que não surge uma segunda reserva.
5. Confirme o feedback persistido. Uma análise posterior sobre o mesmo assunto pode receber esse exemplo revisado; não é obrigatório repetir a categoria se o novo relato divergir.
6. Revogue o acesso da conta ao workspace e confirme bloqueio de análise/feedback, incluindo IDs antigos. Desative a integração e confirme que criar/sincronizar registros continua funcionando.

Não considerar o recurso ativado apenas porque compilou ou porque `/status` retornou `available:true`. Publique o resultado do teste real separado dos testes com provedor simulado. Processamento automático, filas duráveis, avaliações amplas e resumos territoriais ficam para a próxima entrega.
