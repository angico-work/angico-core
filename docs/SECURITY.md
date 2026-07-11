# Segurança do Angico

Este documento descreve os controles implementados e os riscos que permanecem. Ele não substitui revisão periódica, monitoramento de produção, resposta a incidentes ou testes de intrusão.

## Fronteiras de confiança

- `apps/site` é público e não acessa dados operacionais.
- `apps/app` é um cliente não confiável: permissões, ator e workspace sempre são confirmados na API.
- `apps/app/api` é um proxy de mesma origem. A origem upstream é definida somente no servidor e validada como URL HTTPS.
- `apps/api` concentra autenticação, autorização, validação, persistência, memória, uploads e auditoria.
- PostgreSQL e o diretório persistente de uploads são recursos privados da API.
- IndexedDB contém apenas dados do usuário e workspace ativos; não contém cookie de sessão nem credencial de banco.

## Autenticação e sessão

- A autenticação é obrigatória por padrão.
- A sessão usa token aleatório de 256 bits em cookie `HttpOnly`.
- Somente o hash do token é persistido.
- O cookie usa `SameSite=Lax`; `Secure` é obrigatório no perfil de produção.
- Sessões possuem expiração, podem ser revogadas e são revalidadas pelo endpoint `/api/auth/me`.
- Mutações autenticadas por cookie exigem token CSRF associado à sessão.
- Logout revoga a sessão no servidor e remove os dados locais do usuário. Se houver itens não sincronizados, a interface exige confirmação explícita antes do descarte.
- Cadastro público e usuário local de demonstração permanecem desligados por padrão.

O modo offline permite abrir dados locais somente dentro de uma autorização previamente validada e nunca além da expiração da sessão do servidor. Ao recuperar a conexão, uma sessão revogada bloqueia a fila sem apagar seu conteúdo.

## Autorização

- Endpoints privados exigem associação ativa ao workspace.
- Papéis administrativos são verificados na API, não na interface.
- O papel `VIEWER` não altera o domínio compartilhado. Ele pode atualizar apenas o próprio perfil e o próprio estado de leitura de conversas.
- Mutações diretas, sincronização offline, uploads e mensagens revalidam no serviço se o papel atual permite escrita.
- Toda mutação informa o workspace explicitamente; a API não usa o workspace da sessão como fallback para escrita.
- Serviços validam referências entre entidades antes de persistir relações.
- Entidades de outro workspace não podem ser ligadas por IDs enviados pelo cliente.
- Conversas e anexos exigem participação ou papel administrativo.
- Downloads consultam o registro autorizado antes de resolver o arquivo no disco.
- Ator e organização não são aceitos como autoridade a partir do payload; são derivados da sessão e das associações persistidas.
- Pessoas do território podem existir sem identidade de login. Acesso à conta é concedido somente por associação ativa, e o perfil autenticado é lido pelo endpoint de identidade `/api/pessoas/me`.

## Validação e persistência

- Payloads obrigatórios usam validação de entrada e regras adicionais no serviço.
- Chaves offline têm formato e tamanho limitados.
- A idempotência é escopada por workspace, ator canônico, operação e chave.
- O mesmo payload retorna o recurso original; reutilizar a chave com conteúdo diferente retorna `409`.
- Restrições únicas protegem contra concorrência e duplicação de mutações offline.
- Domínio, memória e registro idempotente participam da mesma transação.
- Migrations Flyway são aditivas e verificadas em PostgreSQL vazio e em upgrade.

## Uploads

- Nome, extensão, MIME declarado, assinatura do conteúdo e tamanho são validados.
- O nome original nunca define o caminho persistido.
- O caminho final é normalizado e deve permanecer sob o diretório configurado.
- Downloads usam `Content-Disposition: attachment` e o MIME persistido.
- O limite por arquivo é `2 MB` por padrão; o limite total da aplicação deve permanecer abaixo do teto do proxy.
- Arquivos de evidência recebem SHA-256 para integridade e rastreabilidade.
- Falha da transação remove o arquivo recém-gravado quando o processo continua disponível.

## Navegador e rede

- Site e app enviam `X-Content-Type-Options`, política de referrer, proteção contra frame e política de permissões no deployment.
- A Content Security Policy restringe scripts à própria origem e limita imagens de mapa aos provedores configurados.
- Respostas de autenticação não são armazenadas em cache.
- O service worker não armazena respostas privadas de `/api`.
- CORS fica inativo sem allowlist e permite credenciais somente para origens configuradas.
- O proxy não aceita uma origem arbitrária enviada pelo navegador e não expõe a URL da API no bundle.

## Segredos e dados pessoais

- `.env` e `.env.local` são ignorados.
- Arquivos `.env.example` contêm apenas nomes e valores de desenvolvimento não secretos.
- Senhas, cookies, tokens de sessão, credenciais de banco e chaves de infraestrutura não devem aparecer em logs.
- O repositório não deve conter banco local, uploads, bundle de recuperação ou exportação de dados pessoais.
- Variáveis de produção devem ser definidas como secretas no provedor de deployment.

## Riscos residuais

| Risco | Situação e mitigação necessária |
| --- | --- |
| Tentativas de login | Falta rate limiting distribuído. Aplicar limite por IP e identidade em gateway compartilhado antes de produção pública. |
| Recuperação de conta | Ainda não existe fluxo verificado de recuperação. Provisionar canal de identidade e trilha de auditoria antes de onboarding amplo. |
| Dados offline no dispositivo | IndexedDB não oferece criptografia própria. Usar dispositivos protegidos, sessão curta e remoção no logout; avaliar WebCrypto para campos sensíveis. |
| Revogação enquanto offline | A revogação só pode ser conhecida na reconexão. Operações permanecem bloqueadas até nova autenticação. |
| Arquivos maliciosos | Assinatura e MIME são validados, mas não há antivírus ou sandbox. Adicionar varredura antes de ampliar tipos e limites. |
| Storage | O deployment atual usa volume persistente, sem URL assinada nem replicação. Produção com múltiplas instâncias exige object storage privado. |
| Banco existente | Produção usa Flyway antes de `ddl-auto=validate`, mas qualquer upgrade persistente ainda exige backup, restauração testada e ensaio em cópia anonimizada. |
| Observabilidade | Não há SIEM, alerta de autenticação, drain central ou retenção formal de auditoria. Configurar antes da produção pública. |
| Disponibilidade | O retry offline protege o cliente, mas não substitui backup, réplica, teste de restauração e SLO da API. |
| Concorrência | Restrições e recuperação transacional existem; teste de carga concorrente ainda deve ser executado. |

## Checklist de release

1. Confirmar `ANGICO_AUTH_REQUIRED=true`, cadastro e seed desativados.
2. Confirmar cookie seguro e origens exatas de site/app.
3. Validar que `ANGICO_API_ORIGIN` é HTTPS e server-side.
4. Fazer backup do PostgreSQL e testar restauração.
5. Executar preflight de duplicidades e smoke de migrations.
6. Confirmar volume ou object storage persistente e privado.
7. Executar testes de isolamento, uploads, idempotência, offline e mensagens.
8. Executar auditoria de dependências, busca por segredos e revisão do histórico que será publicado.
9. Revisar CSP, headers, logs e alertas no ambiente publicado.
10. Manter a release anterior disponível para rollback.
