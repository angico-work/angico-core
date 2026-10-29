# Validação da integração de IA — 29/10/2026

Implementação preservada na branch local `feat/api-intelligence`, a partir de `3a3096b`. Não foi publicada ou integrada em main/dev/production.

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

Os testes de frontend usaram dependências já instaladas (Vite 8.1.x e Vitest 4.1.10); o lockfile contém versões mais recentes. Portanto uma instalação limpa conforme lockfile e o CI continuam sendo gates de integração, mesmo com testes locais verdes. Nenhuma dependência foi adicionada por esta implementação.

## Bloqueios observados

- **GitHub:** leitura autenticada funciona; `create_branch` devolveu `403 Resource not accessible by integration`. O git local não resolve `github.com`. Nenhuma branch remota de IA foi criada e nenhum push foi concluído.
- **Vercel:** equipe Angico recusou acesso com 403. A tentativa de gerar consentimento para o ID retornado pela plataforma deu 404. A conexão atual listou somente a equipe pessoal. Não foram lidas ou alteradas credenciais.
- **Navegador:** `npm run verify` do app e do site chegou ao E2E, mas o sandbox recusou o servidor local com `listen EPERM`. Não contabilizar esses comandos como completos.
- **Auditorias npm:** bloqueadas por `ENOTFOUND registry.npmjs.org`. Não afirmar ausência de vulnerabilidades nesta rodada.
- **Integração externa:** CI remoto, PostgreSQL real, Docker/deploy e teste real OpenAI não foram validados nesta rodada. O recurso permanece desativado por padrão no código.

## Decisões e limites mantidos

1. Recuperar até 50 registros recentes por tipo e escolher até 20 fontes. Isso limita custo e tempo; correspondências antigas podem ficar de fora.
2. Manter ativação e publicação pendentes até completar os gates externos. Isso adia disponibilidade, preservando a instalação atual.
3. Não atribuir acurácia sem avaliação real de modelo, citações e resistência a instruções maliciosas no contexto. O comportamento semântico pode divergir das respostas simuladas.
4. Manter E2E como gate de integração. Problemas exclusivos do navegador podem aparecer no CI.
5. Manter auditoria e validação do ambiente publicado como gates. Avisos novos de dependências e falhas de deployment podem permanecer desconhecidos.
6. Usar a cópia limpa para concluir a suíte Java; o CI ainda precisa confirmar seu próprio ambiente.

Para ativação e teste sintético, seguir [INTELLIGENCE_OPERATIONS.md](INTELLIGENCE_OPERATIONS.md). A chave OpenAI deve ser configurada como segredo no servidor, nunca enviada no chat. Antes de integrar, publicar a branch, concluir o CI e revisar o teste de ativação.
