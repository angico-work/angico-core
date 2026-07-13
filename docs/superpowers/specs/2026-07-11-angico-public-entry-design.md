# Angico Public Entry — Território em Movimento

**Data:** 2026-07-11

**Status:** design aprovado

**Escopo:** `apps/site`

## Contexto

O site público atual explica corretamente o Angico, mas depende de blocos extensos de texto. A tela de login da aplicação possui uma atmosfera visual mais forte, porém deve permanecer enxuta e dedicada ao acesso autenticado.

A nova entrada pública deve preservar a separação entre site e aplicativo, usar a linguagem visual que funciona no login e mostrar o Angico em ação antes de pedir leitura. O mapa territorial detalhado será o elemento principal. Ele apresentará, como demonstração, a passagem de uma observação por ação, evidência e resultado.

## Objetivos

- Cativar antes de explicar, usando o território como primeira impressão.
- Explicar por que o Angico é diferente com menos texto e mais relações visuais.
- Mostrar o Rastro Verificável ligado ao mapa, não como um grafo decorativo separado.
- Dar um caminho direto a membros existentes sem misturar o formulário de login ao site público.
- Converter visitantes interessados por meio de “Quero levar o Angico ao meu território”.
- Preservar honestidade de dados, privacidade, acessibilidade, desempenho e independência entre aplicações.

## Fora do escopo

- Alterar `apps/app`, a rota `/login`, o formulário de acesso ou a autenticação.
- Consultar dados operacionais, workspaces, territórios, usuários ou APIs privadas.
- Exibir um mapa real de cliente, comunidade ou organização.
- Adicionar Leaflet, tiles remotos ou outra dependência cartográfica ao site público.
- Criar cadastro público, preços, planos ou fluxo de aquisição automatizado.

## Público e ações principais

O site atende dois públicos sem confundi-los:

1. **Visitante interessado:** entende o produto e usa “Quero levar o Angico ao meu território”, que navega até o contato existente.
2. **Membro atual:** usa “Já sou membro”, que abre a URL pública da aplicação fornecida por `VITE_APP_URL`.

O CTA de contato é primário. O acesso de membros é secundário e permanece visível no cabeçalho.

## Direção visual

### Conceito

**Território em movimento:** o mapa ocupa a maior parte da primeira dobra. O visitante vê o lugar ganhar contexto e acompanha uma sequência curta de registros conectados. As explicações aparecem abaixo, em blocos curtos e editoriais.

### Sistema visual

- Preservar a paleta atual: azul profundo, azul Angico, verde-água e marfim.
- Preservar Garet como família de comunicação e Space Mono para rótulos, etapas e legendas.
- Usar o mapa como única peça visual dominante.
- Manter as seções posteriores planas, precisas e com pouco ornamento.
- Usar a folha oficial somente no rodapé animado e em detalhes de marca necessários.
- Evitar cartões genéricos, gradientes decorativos, brilho, blur e excesso de cantos arredondados.

## Arquitetura da informação

### 1. Cabeçalho

- Wordmark Angico à esquerda.
- Links de âncora “Por que é único” e “Como funciona”.
- CTA contornado “Já sou membro” à direita, condicionado a `appUrl`.
- O cabeçalho deve continuar legível sobre a primeira dobra e permanecer compacto em telas pequenas.

### 2. Hero — território em movimento

Conteúdo proposto:

- Rótulo: **Memória operacional socioambiental**.
- Título: **O trabalho continua. A memória também.**
- Apoio: **O Angico conecta território, autoria, evidência e resultado para que uma ação possa ser retomada, compreendida e demonstrada ao longo do tempo.**
- CTA primário: **Quero levar o Angico ao meu território** → `#contato`.

O mapa detalhado aparece como paisagem, não como uma janela de dashboard. O texto fica sobre uma área de contraste controlado e não cobre informações essenciais do desenho.

### 3. Por que o Angico é único

Três ideias curtas substituem as seções textuais redundantes:

- **Território com contexto:** localização, pessoas e trabalho permanecem ligados ao registro.
- **Evidência com autoria:** a prova preserva quem registrou, quando e de onde veio.
- **Rastro sem lacunas ocultas:** o Angico mostra o que está conectado e o que ainda falta registrar.

Uma nota compacta preserva a fronteira pública: o site demonstra o princípio; o aplicativo autenticado guarda o trabalho.

### 4. Como funciona

Uma faixa visual resume o percurso sem repetir o hero:

1. **Observar** — registrar o que acontece no lugar.
2. **Agir** — organizar a resposta e manter responsáveis e recursos ligados.
3. **Comprovar** — anexar evidência com origem e autoria.
4. **Continuar** — acompanhar resultados, lacunas e próximos registros.

### 5. Contato

Reutilizar `ContactSection` e orientar sua chamada por:

- Título: **Quero levar o Angico ao meu território**.
- Texto curto voltado a organizações, comunidades e equipes de campo.
- Comportamento atual de envio, erro e indisponibilidade preservado.

### 6. Footer animado

- Fundo azul profundo e espaço vertical suficiente para a animação respirar.
- Marca, frase curta e retorno ao início continuam presentes.
- Um único ícone oficial de folha cai continuamente, com leve deslocamento diagonal e rotação natural.
- A folha reinicia somente depois de sair da área visível.
- O footer não cria múltiplas folhas nem partículas adicionais.

## Mapa demonstrativo

### Conteúdo cartográfico

O SVG local deve conter detalhes suficientes para parecer um território legível:

- limite territorial;
- hidrografia;
- caminhos locais;
- áreas de vegetação ou cuidado;
- zonas acompanhadas;
- nomes genéricos de elementos cartográficos;
- legenda para observação, ação, evidência e resultado.

Os nomes devem ser explicitamente demonstrativos e não corresponder a um cliente ou território real. O mapa exibirá o rótulo **“Demonstração visual — sem dados operacionais”**.

### Rastro sobre o território

A sequência visual conecta quatro estados:

`Observação → Ação → Evidência → Resultado`

Cada estado aparece no mapa por marcador e segmento de percurso. Pequenos rótulos mostram apenas o necessário para explicar a relação. Não serão exibidos métricas, percentuais, selos, pontuações ou alegações de impacto.

### Movimento do hero

A animação toca uma vez por carregamento:

1. **0–800 ms:** limite e relevo visual aparecem.
2. **800–1.800 ms:** água, caminhos, áreas e nomes ganham definição.
3. **1.800–2.600 ms:** surge a observação.
4. **2.600–3.400 ms:** o percurso alcança a ação.
5. **3.400–4.200 ms:** aparece a evidência.
6. **4.200–5.000 ms:** surge o resultado.
7. **5.000–6.000 ms:** a composição repousa no estado completo.

O movimento não reinicia, não depende de interação e não bloqueia leitura ou CTAs.

### Movimento do footer

- Duração alvo de 8–10 segundos por queda.
- Loop infinito somente na folha.
- Trajetória suave, levemente diagonal, com rotação lenta.
- Sem aceleração brusca ou oscilação contínua de outros elementos.

### Redução de movimento

Sob `prefers-reduced-motion: reduce`:

- o mapa abre diretamente no estado final completo;
- nenhuma etapa usa atraso perceptível;
- a folha fica repousada no rodapé;
- a ordem e o significado continuam disponíveis sem movimento.

## Arquitetura de componentes

As alterações permanecem dentro de `apps/site` e não importam código de `apps/app`.

### `TerritoryHero`

Responsável pelo conteúdo da primeira dobra, CTA de contato e composição entre texto e mapa. Não recebe `appUrl`; o acesso de membros pertence exclusivamente ao cabeçalho.

### `TerritoryStoryMap`

Responsável pelo SVG cartográfico, legenda, estados do Rastro e classes de animação. Não recebe dados remotos e não conhece autenticação, contato ou configuração de ambiente.

### `WhyAngico`

Responsável pelos três diferenciais, pela fronteira entre site e aplicativo e pela faixa “Como funciona”. O conteúdo é estático, curto e verificável.

### `AnimatedLeafFooter`

Responsável pelo rodapé e pela animação da folha. Reutiliza o ativo oficial local por imagem ou máscara CSS; não duplica o desenho da marca em um novo arquivo remoto.

### Componentes preservados

- `ContactSection` permanece responsável pelo formulário e seus estados.
- `Site` continua compondo a página e recebendo `appUrl` e `contactApiUrl`.

## Fluxo de configuração e dados

```text
Variáveis Vite
  ├─ VITE_APP_URL ─────────► Site ─► Cabeçalho “Já sou membro”
  └─ VITE_CONTACT_API_URL ─► Site ─► ContactSection

Conteúdo local
  └─ TerritoryStoryMap ─────► SVG e animação demonstrativa
```

O mapa não faz `fetch`, não usa geolocalização, não solicita tiles e não persiste estado no navegador.

## Estados de erro e indisponibilidade

- Sem `appUrl`, não renderizar um link implícito; apresentar a indisponibilidade do acesso de membros de modo compacto e acessível.
- Sem `contactApiUrl`, preservar o estado explícito de indisponibilidade do contato.
- Em falha de envio, preservar os campos preenchidos e mostrar a orientação existente.
- O mapa local não possui estado de carregamento remoto nem fallback com dados inventados.
- Uma falha de ativo de marca não deve remover os textos e links essenciais do footer.

## Acessibilidade

- O SVG visual será `aria-hidden` e uma legenda textual equivalente descreverá o percurso.
- A ordem do DOM deve acompanhar a ordem de leitura: título, apoio, CTA, explicação do mapa.
- Links e botões mantêm foco visível e alvos adequados para toque.
- O texto sobre o mapa deve atingir contraste AA em todos os estados da animação.
- O significado não depende apenas de cor; cada marcador combina forma com rótulo ou numeração.
- Navegação por teclado, skip link e landmarks existentes permanecem.
- O layout deve funcionar em zoom de texto e sem overflow horizontal a partir de 320 px.

## Responsividade

- **Desktop:** mapa ocupa a maior parte da primeira dobra e o texto fica sobre uma área de contraste controlado.
- **Tablet:** mapa continua dominante; texto e CTAs usam largura limitada e não cobrem o Rastro.
- **Mobile:** primeira dobra vira uma composição vertical. O título e o CTA vêm antes do mapa; o mapa mantém proporção legível e a legenda passa para baixo da ilustração.
- O botão “Já sou membro” permanece acessível no cabeçalho móvel sem abrir o formulário dentro do site.
- O footer mantém uma área segura para a folha sem aumentar excessivamente a altura da página.

## Desempenho

- Não adicionar dependências de mapa ou animação.
- Preferir SVG inline e CSS para o percurso.
- Reutilizar ativos locais já versionados.
- Manter o JavaScript e o CSS dentro dos orçamentos atuais de `apps/site`.
- Evitar listeners globais, timers contínuos e animações controladas por React.
- Animar somente `transform`, `opacity` e traços SVG quando possível.

## Verificação

### Testes de componente

- Renderiza título, apoio, CTA principal e rótulo de demonstração.
- “Já sou membro” aponta para `appUrl` quando configurado.
- Ausência de `appUrl` não cria link implícito.
- Diferenciais e quatro etapas aparecem na ordem correta.
- Footer contém a folha oficial e conteúdo textual essencial.
- O site não apresenta conta, território ou métrica operacional como real.

### Testes de movimento e acessibilidade

- Movimento normal aplica a sequência única do mapa e o loop apenas à folha.
- Movimento reduzido mostra mapa completo e folha estática.
- Axe não encontra violações sérias ou críticas.
- Teclado alcança navegação, CTAs, contato e retorno ao início.

### Testes de navegador

- Smoke em 320, 375, 430 e 1440 px.
- Sem overflow horizontal, erros de console ou requisições cartográficas externas.
- Contraste e legibilidade do texto sobre o mapa verificados no estado inicial e final.
- O contato continua preservando dados em caso de falha.
- O botão de membro funciona com a configuração real de ambiente.

### Gates de entrega

- Lint sem warnings.
- Typecheck.
- Testes unitários.
- Testes do orçamento de bundle.
- Build de produção.
- Playwright responsivo e acessível.
- `npm audit --audit-level=high` sem regressão introduzida pela mudança.

## Critérios de aceitação

- A primeira dobra é dominada pelo território, não por texto ou cartões.
- O visitante entende visualmente a relação entre observação, ação, evidência e resultado.
- O mapa combina camadas cartográficas com o Rastro Verificável.
- A animação do mapa toca uma vez e o footer mantém uma única folha em queda contínua.
- Movimento reduzido preserva todo o conteúdo sem animação.
- “Já sou membro” abre a aplicação; o login permanece intocado.
- “Quero levar o Angico ao meu território” conduz ao contato existente.
- Nenhum dado privado, operacional ou falsamente apresentado é consultado ou exibido.
- O site continua independente de `apps/app` e `apps/api` em código e dependências.
