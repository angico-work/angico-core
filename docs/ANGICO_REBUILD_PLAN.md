# Plano de reconstrução do Angico

## Objetivo

Transformar o Angico em uma infraestrutura operacional socioambiental capaz de registrar o trabalho de campo, preservar sua origem e relacionar território, participantes, ações, evidências, resultados e medições. A reconstrução evita dados demonstrativos implícitos, relações inferidas e interfaces que escondam a condição real do sistema.

## Diagnóstico inicial

O repositório já possuía uma API Spring Boot e uma interface React, mas as fronteiras de produto, os fluxos de autenticação e a memória operacional ainda estavam incompletos.

Os principais problemas encontrados foram:

- site institucional e aplicação operacional derivados do mesmo frontend;
- autenticação e cadastro com comportamentos permissivos de desenvolvimento;
- autorização de workspace aplicada de forma desigual entre módulos;
- entidades operacionais sem o mesmo nível de proveniência, histórico e validação;
- relações mantidas por referências soltas ou sem encerramento temporal;
- mensagens pouco ligadas ao contexto operacional;
- sincronização offline restrita a poucos tipos de registro;
- anexos sem uma fila local durável;
- visualização de memória sem um percurso verificável entre origem, trabalho, prova e resultado;
- telas existentes apoiadas em dados de exemplo ou fluxos parciais;
- configuração de build e publicação compartilhada ou insuficientemente delimitada;
- código experimental e documentos de implementação que não representavam o produto real.

## Arquitetura adotada

```text
apps/site  site institucional público
apps/app   aplicação autenticada e offline-first
apps/api   API, domínio, autorização, memória e sincronização
docs       contratos operacionais e decisões de arquitetura
```

Os três produtos possuem dependências, arquivo de ambiente, documentação, testes e build próprios. Não existem imports entre eles. O monorepositório permanece apenas como forma de desenvolvimento coordenado e pode ser dividido preservando o histórico conforme `REPOSITORY_SPLIT.md`.

### Site

- React e Vite, sem dependências da aplicação privada.
- Narrativa editorial sobre território, continuidade e impacto verificável.
- Formulário de contato exibido somente quando existe um destino configurado.
- Chamadas para a aplicação fornecidas por variável de ambiente.
- Sem credenciais, regras administrativas ou acesso a dados privados.

### Aplicação

- React, TypeScript estrito, React Router e Leaflet.
- Rotas operacionais carregadas sob demanda.
- Sessão por cookie, proteção CSRF e seleção explícita de workspace.
- IndexedDB versionado, outbox, rascunhos, anexos locais e centro de sincronização.
- Telas para território, observações, problemas, missões, ações, evidências, resultados, indicadores, organizações, recursos, mensagens, memória e Rastro.

### API

- Spring Boot, JPA, Bean Validation, H2 para desenvolvimento/testes e PostgreSQL para operação futura.
- Sessões persistentes, autorização por associação ativa ao workspace e proteção CSRF.
- Domínio separado por módulos e memória operacional pragmática sobre objetos, relações e eventos.
- Chaves de idempotência para mutações offline.
- Upload privado com validação de tamanho, extensão, MIME, assinatura e hash.
- Migrations equivalentes para H2 e PostgreSQL.

## Fluxos principais

### Autenticação e autorização

1. A pessoa autentica com uma identidade existente.
2. A API cria uma sessão persistida e envia o cookie protegido.
3. O app consulta a conta e as associações ativas.
4. Cada requisição privada valida sessão, CSRF e acesso ao workspace.
5. A API deriva a autoria da sessão; o cliente não escolhe o ator de uma mutação.
6. Exclusão ou revogação encerra o acesso e impede que uma associação antiga seja recriada implicitamente.

### Memória operacional

1. A mutação valida o objeto e suas referências no mesmo workspace.
2. O domínio grava o estado canônico.
3. O publicador registra o objeto estável, as relações explícitas e o evento ocorrido.
4. Consultas de histórico aplicam o mesmo limite de acesso do objeto original.
5. Relações temporais são encerradas, não sobrescritas, quando uma participação termina.

### Operação offline

1. Dados autorizados são salvos em uma partição local vinculada à pessoa e ao workspace.
2. Mutações permitidas recebem UUID e chave de idempotência no dispositivo.
3. Registros e arquivos permanecem na outbox até confirmação da API.
4. A reconexão dispara tentativas com backoff e preserva falhas ou conflitos para ação humana.
5. Respostas HTTP nunca são mascaradas como cache válido; somente uma falha real de rede permite usar o último snapshot.
6. Sessão expirada bloqueia novas sincronizações e mantém o trabalho pendente até nova autenticação.

## Ontologia operacional

A base é formada por:

- objetos estáveis: pessoa, workspace, território, observação, potencialidade, problema, missão, ação, evidência, resultado, indicador, medição, organização, recurso, conversa e mensagem;
- relações explícitas: participação, responsabilidade, localização, origem, uso, comprovação, produção de resultado, medição e contexto de conversa;
- eventos imutáveis com momento ocorrido, momento registrado, ator, origem e estado de sincronização;
- consultas autorizadas de histórico, vizinhança e percurso verificável.

O modelo não usa event sourcing integral. As tabelas de domínio continuam sendo a fonte do estado atual; a memória registra proveniência e relações necessárias para explicar como esse estado foi construído.

## Rastro Verificável

O Rastro foi escolhido como função diferenciada porque transforma a ontologia em uma ferramenta de trabalho. A consulta percorre somente relações existentes entre território, origem, missão, ação, evidência, resultado e indicador. Lacunas são apresentadas com motivo e próximo registro possível, sem pontuação, certificação automática ou causalidade inventada.

O read model é calculado pela API com limites de expansão e isolamento por workspace. A interface permite abrir a fonte de cada etapa e distinguir uma relação confirmada de um registro ainda pendente de sincronização.

## Fases executadas

1. **Descoberta:** inventário do repositório, dependências, rotas, domínio, persistência, testes e riscos.
2. **Fronteiras:** separação real entre site, app e API, com ambientes e pipelines independentes.
3. **Fundação:** autenticação, autorização, isolamento, idempotência, validação, uploads, migrations e CI.
4. **Ontologia:** unificação da memória operacional, proveniência, relações temporais e consultas autorizadas.
5. **Offline:** IndexedDB versionado, outbox, anexos, snapshots, expiração de sessão e política de fallback.
6. **Mensagens:** conversas diretas ou em grupo, contexto ontológico, busca, leitura, anexos e fila offline.
7. **Rastro:** API, regras determinísticas, interface, navegação para fontes e testes de integração.
8. **Experiência:** site editorial e app operacional responsivos, com estados vazios, falhas, carregamento e sincronização visível.
9. **Qualidade:** testes, builds, auditoria de dependências, verificação de segurança, PostgreSQL efêmero e revisão em navegador local.

## Decisões técnicas

- Preservar React, Spring Boot e JPA em vez de reescrever tecnologia estável.
- Manter o monorepositório como coordenação local, mas sem dependências cruzadas.
- Usar sessão persistida e cookie em vez de credenciais no armazenamento do navegador.
- Derivar autoria e escopo no servidor.
- Tratar workspace como fronteira obrigatória de autorização.
- Guardar eventos e relações em uma memória operacional complementar, sem duplicar todo o domínio.
- Não criar relações para preencher lacunas de demonstração.
- Expor falhas e conflitos de sincronização em vez de apagar ou reconciliar dados silenciosamente.
- Usar armazenamento local apenas para dados já autorizados e particionados pela identidade ativa.
- Adiar recursos que dependem de infraestrutura externa, como rate limiting distribuído, antivírus e object storage.

## Riscos e limites conhecidos

- A baseline integral e o boot com `ddl-auto=validate` foram provados localmente; uma cópia anonimizada e um ensaio de restauração ainda são necessários antes de uma operação pública.
- Não há rate limiting distribuído, recuperação de conta, SIEM, antivírus de uploads ou object storage privado.
- IndexedDB depende da proteção do dispositivo e não fornece criptografia própria.
- Revogação ocorrida durante ausência de rede só é conhecida na próxima autenticação ou sincronização.
- O Rastro demonstra consistência e proveniência do registro, não certifica a realidade material da evidência.
- A primeira versão offline não cria relações contra objetos que ainda não possuem identidade confirmada no servidor.

Esses limites estão detalhados em `SECURITY.md` e `OFFLINE_ARCHITECTURE.md`; nenhum deles deve ser ocultado por dados simulados ou mensagens de sucesso.

## Critérios de conclusão

- [x] site, app e API possuem fronteiras, dependências e builds independentes;
- [x] identidade visual e narrativa próprias foram preservadas no site e no app;
- [x] autenticação e acesso por workspace são validados no servidor;
- [x] mutações importantes registram autoria, origem, relações e eventos;
- [x] histórico e relações são navegáveis;
- [x] mensagens possuem contexto, permissão, busca, leitura e envio offline;
- [x] o Rastro funciona de ponta a ponta sem inventar etapas;
- [x] operações de campo essenciais possuem fila local e idempotência;
- [x] dados sincronizados podem ser consultados durante uma falha real de rede;
- [x] evidências e anexos pendentes sobrevivem a falhas de envio;
- [x] estados vazios, falhas e sincronização são visíveis;
- [x] documentação de arquitetura, segurança, ontologia e separação está atualizada;
- [ ] publicação externa, provisionamento de banco oficial e DNS, deliberadamente fora desta execução;
