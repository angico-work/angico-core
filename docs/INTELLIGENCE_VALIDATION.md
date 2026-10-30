# Validação da integração de IA — 29/10/2026

Implementação publicada na branch `feat/api-intelligence`, a partir de `3a3096b`, no [PR #7](https://github.com/angico-work/angico-core/pull/7). Ainda não foi integrada em main/dev/production. O GitHub recebeu `bc0a1d6`; a correção posterior do smoke test aguarda novo push.

## Verificação no CI do PR

- [App](https://github.com/angico-work/angico-core/actions/runs/40976662258): instalação limpa pelo lockfile, lint, TypeScript, 391 testes, 3 testes de orçamento, 9 testes de navegador e limites de bundle passaram. A auditoria npm reportou zero vulnerabilidades.
- [API](https://github.com/angico-work/angico-core/actions/runs/40976662269): `mvn clean verify` passou com 256 testes. O perfil de produção iniciou com PostgreSQL 17 e aplicou V0–V8. O smoke test falhou porque sua asserção ainda esperava V0–V6; o build Docker posterior foi pulado.
- A expectativa do smoke test foi corrigida para V0–V8, incluindo as versões aceitas como origem de upgrade. A divergência foi reproduzida comparando a expectativa com os arquivos de migration; a comparação e `bash -n` passaram após a correção. A execução completa depende de novo CI: o Docker local não está disponível.
- Os status do GitHub registram builds Vercel de preview concluídos para app e site em `bc0a1d6`. Isso não confirma ativação da IA ou publicação em produção.

## Verificações executadas

| Verificação | Resultado |
|---|---|
| API `mvn verify` com Java 25 e agente Mockito explícito | 256 testes, zero falhas; JAR produzido. |
| Bootstrap do perfil prod com Flyway e validação Hibernate em H2 | Passou com migrations V0–V8. |
| App: lint, TypeScript e testes | 391 testes passaram. |
| Site: lint, TypeScript e testes | 20 testes passaram. |
| Builds e limites de bundle | Passaram: app JS 666.950/680.000 bytes, CSS 61.724/68.000; site JS 216.854/225.000, CSS 15.206/16.000. |
| Revisão independente do código | Duas falhas importantes corrigidas e cobertas por testes que falharam antes da correção: feedback atrasado atravessando análises; perda de uso de tokens em respostas recusadas/incompletas. Nenhuma pendência menor registrada. |

A API foi validada em cópia temporária limpa; os arquivos de código/migrations/testes foram comparados com a branch e coincidem. O caminho original apresentava lentidão na descoberta de classes Spring. O agente Mockito explícito evita o bloqueio do sandbox à instrumentação dinâmica do Java.

Os testes locais de frontend usaram dependências já instaladas (Vite 8.1.x e Vitest 4.1.10); o lockfile contém versões mais recentes. O CI do app confirmou a instalação limpa pelo lockfile. O site, sem alterações nesta branch, não disparou seu workflow no PR. Nenhuma dependência foi adicionada por esta implementação.

## Bloqueios observados

- **GitHub:** o usuário publicou a branch e abriu o PR #7. A integração continua recusando escrita com `403 Resource not accessible by integration`, inclusive ao enviar a correção do smoke test. O ambiente local não resolve `github.com`; o próximo push precisa ocorrer fora dele.
- **Vercel:** equipe Angico recusou acesso com 403. A tentativa de gerar consentimento para o ID retornado pela plataforma deu 404. A conexão atual listou somente a equipe pessoal. Não foram lidas ou alteradas credenciais.
- **Navegador:** a restrição local `listen EPERM` persiste; os 9 E2E do app passaram no CI. O E2E do site não foi reexecutado nesta branch.
- **Auditorias npm:** bloqueadas localmente por DNS; o CI do app reportou zero vulnerabilidades. A auditoria do site não foi reexecutada nesta branch.
- **Integração externa:** PostgreSQL real iniciou com as novas migrations, mas o smoke test completo e o build Docker aguardam novo CI. Teste real OpenAI e comportamento em produção seguem sem validação. O recurso permanece desativado por padrão no código.

## Decisões e limites mantidos

1. Recuperar até 50 registros recentes por tipo e escolher até 20 fontes. Isso limita custo e tempo; correspondências antigas podem ficar de fora.
2. Manter ativação e publicação pendentes até completar os gates externos. Isso adia disponibilidade, preservando a instalação atual.
3. Não atribuir acurácia sem avaliação real de modelo, citações e resistência a instruções maliciosas no contexto. O comportamento semântico pode divergir das respostas simuladas.
4. Manter E2E como gate de integração. O app passou esse gate no PR; o site não teve alterações.
5. Manter auditoria e validação do ambiente publicado como gates. A auditoria do app passou; produção ainda precisa ser validada.
6. Usar a cópia limpa para concluir a suíte Java; o CI ainda precisa confirmar seu próprio ambiente.

Para ativação e teste sintético, seguir [INTELLIGENCE_OPERATIONS.md](INTELLIGENCE_OPERATIONS.md). A chave OpenAI deve ser configurada como segredo no servidor, nunca enviada no chat. Antes de integrar, enviar a correção do smoke test, concluir o CI e revisar o teste de ativação.
