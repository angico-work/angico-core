# Angico Public Entry — Atlas Territorial e Contexto Climático

**Data:** 2026-07-11

**Status:** design aprovado

**Escopo:** `apps/site`

## Relação com a especificação anterior

Esta especificação evolui o desenho definido em
`docs/superpowers/specs/2026-07-11-angico-public-entry-design.md`.

As decisões anteriores continuam válidas, exceto onde este documento as substitui
explicitamente:

- o footer passa de uma para **doze folhas** decorativas;
- o mapa deixa de ser fundo recortado e passa a ser um **atlas integral em região própria**;
- o site passa a exibir **indicadores climáticos públicos e verificáveis**;
- a proibição de métricas continua valendo apenas para dados operacionais privados,
  números inventados e resultados não comprovados do Angico;
- o hero deixa de sobrepor texto, Rastro e mapa.

Login, autenticação, aplicação interna, dados de workspace e formulário de contato não
são redesenhados por este escopo.

## Problema observado

O screenshot de referência em `1538 × 789` mostrou três falhas da versão atual:

1. O hero cresce além da altura disponível depois do cabeçalho, deixando CTA, rótulos e
   parte do Rastro abaixo da primeira dobra.
2. Texto, gradiente, SVG e Rastro compartilham a mesma área; o mapa funciona como fundo,
   usa `overflow` e parece cortado.
3. O footer contém apenas uma folha porque componente, CSS, teste e especificação anterior
   exigem exatamente esse comportamento.

A página também explica o produto com clareza, mas ainda não comunica a escala humana e
territorial da crise climática apresentada no pitch do Angico.

## Objetivos

- Mostrar o mapa completo e legível em qualquer viewport a partir de 320 px.
- Dar ao hero uma composição editorial 38/62, sem texto sobre informações cartográficas.
- Tornar o atlas mais rico, local e coerente com escolas, bairros e comunidades.
- Conectar o propósito do Angico a deslocamento, seca, calor, falta de arborização,
  alagamentos e resposta comunitária.
- Exibir indicadores reais com valor, geografia, período, fonte e ressalva metodológica.
- Criar um fluxo contínuo de folhas no footer, sem aleatoriedade em runtime.
- Preservar acessibilidade, redução de movimento, honestidade de dados e independência do
  site público.

## Fora do escopo

- Expor medições privadas de `apps/api` ou de workspaces.
- Criar um endpoint público de impacto.
- Atribuir a qualquer iniciativa do Angico resultados que ainda não foram medidos.
- Alterar `apps/app`, `/login`, autenticação ou autorização.
- Buscar indicadores em runtime.
- Adicionar Leaflet, Mapbox, tiles, geolocalização ou dependência cartográfica.
- Fazer o atlas demonstrativo corresponder a um cliente, escola ou comunidade real.

## Princípio de honestidade

O site separa duas camadas de informação:

1. **Atlas demonstrativo:** explica como o Angico liga território, observação, ação,
   evidência e resultado. Não contém dados de cliente nem valores ambientais.
2. **Contexto climático público:** apresenta indicadores externos, com fonte e período,
   para mostrar por que memória territorial e ação local importam.

O site não usa as expressões “impacto do Angico”, “resultado gerado pelo Angico” ou
equivalentes ao apresentar os indicadores públicos.

## Direção visual

### Conceito

**Atlas territorial:** a primeira dobra se comporta como uma prancha cartográfica de
campo, não como dashboard e não como imagem de fundo. Texto e mapa ocupam regiões próprias.

### Sistema visual

- Azul profundo `#003952`: estrutura e fundo do hero/footer.
- Azul Angico `#004B6C`: títulos, rotas e dados principais.
- Verde-água `#34ABA6`: água, movimento e realces.
- Verde de vegetação `#2D8B73`: cobertura e áreas de cuidado.
- Marfim `#F5F2EC`: página, margens e suporte cartográfico.
- Ocre `#B7653B`: pressão ambiental, usado somente em cicatriz de fogo e alertas.
- Garet/Bricolage continua responsável por títulos e números.
- DM Sans/Garet Book continua responsável por leitura longa.
- Space Mono fica restrita a fonte, período, escala, grade e legenda.

### Assinatura visual

O elemento memorável será a **marginalia cartográfica**: escala, norte, grade de referência,
fonte e período aparecem nas bordas do atlas e da seção climática. Esses elementos codificam
origem e contexto, em vez de funcionar como decoração.

## Arquitetura da página

```text
Site
├─ Header existente
├─ TerritoryHero
│  ├─ copy + CTA
│  └─ TerritoryAtlas
│     ├─ prancha cartográfica integral
│     ├─ legenda de camadas
│     └─ Rastro demonstrativo
├─ EnvironmentalContext
│  ├─ indicador principal: deslocamento
│  └─ três sinais: seca, arborização e desastres municipais
├─ WhyAngico existente
├─ ContactSection existente
└─ AnimatedLeafFooter
   └─ doze folhas determinísticas
```

`EnvironmentalContext` entra imediatamente depois do hero. O visitante primeiro vê o
Angico organizar um território e depois entende a pressão climática que torna essa memória
necessária.

## Hero

### Copy preservada

- Rótulo: **Memória operacional socioambiental**.
- Título: **O trabalho continua. A memória também.**
- Apoio: **O Angico conecta território, autoria, evidência e resultado para que uma ação
  possa ser retomada, compreendida e demonstrada ao longo do tempo.**
- CTA: **Quero levar o Angico ao meu território** → `#contato`.

O tamanho máximo do título será reduzido para caber com CTA em viewports desktop baixos.
O texto não ficará sobre o SVG.

### Layout desktop

Em larguras a partir de 1100 px:

- copy: 38% da largura útil;
- atlas: 62% da largura útil;
- gutter explícito entre as duas regiões;
- altura orientada pelo espaço abaixo do cabeçalho, sem exceder a dobra de `1538 × 789`;
- CTA, mapa, legenda e Rastro permanecem visíveis sem scroll interno.

### Layout tablet e mobile

Entre 721 e 1099 px:

1. copy;
2. CTA;
3. atlas integral;
4. legenda e Rastro.

Até 720 px, a mesma ordem permanece e todos os elementos usam fluxo normal. O SVG não será
reposicionado por valores absolutos dependentes da largura da tela.

Como rótulos internos de um `viewBox` de 1200 unidades ficariam ilegíveis em uma prancha de
288 px, até 720 px eles dão lugar a uma linha externa legível de sinais locais. O resumo
acessível continua completo; geometria, padrões e marcadores permanecem visíveis no SVG.

## TerritoryAtlas

### Enquadramento

- `viewBox="0 0 1200 760"` pode ser preservado.
- `preserveAspectRatio="xMidYMid meet"` será explícito.
- A prancha usará `aspect-ratio: 1200 / 760` como base. Até 480 px, poderá ganhar altura
  mínima para formar bandas de marginalia legíveis; o SVG conserva sua proporção integral
  com `meet`, sem esticar ou cortar o mapa.
- Todo conteúdo cartográfico terá uma margem segura interna.
- O SVG não usará `object-fit: cover`, `slice` ou transformações para compensar cortes.
- A moldura pode esconder apenas ornamentação externa; nenhum rótulo, marcador, rota ou
  limite territorial pode ultrapassar a área visível.

### Conteúdo cartográfico

O atlas continua demonstrativo, mas ganha densidade e hierarquia:

- limite do território;
- curvas de nível discretas;
- rio principal, afluentes e área de drenagem;
- dois caminhos locais e uma travessia;
- cobertura vegetal contínua e fragmentos menores;
- cicatriz de fogo em ocre;
- área de cuidado;
- escola, praça e ponto comunitário genéricos;
- pontos de alagamento, calor e falta de sombra como categorias demonstrativas;
- seta norte;
- escala ilustrativa `0 · 250 · 500 m`;
- grade `A–D / 1–4`, sem coordenadas geográficas falsas;
- legenda de água, vegetação, pressão, caminho e registro.

O rótulo será **Atlas demonstrativo — sem dados operacionais**.

### Rastro

O percurso continua:

`Observação → Ação → Evidência → Resultado`

Marcadores e segmentos permanecem sobre o mapa, mas a explicação textual sai da área
cartográfica e vira uma faixa própria abaixo da prancha. Nenhum painel cobre o desenho.

### Movimento

O atlas anima uma vez:

1. grade, limite e relevo;
2. água, caminhos e cobertura;
3. sinais locais;
4. observação;
5. ação;
6. evidência;
7. resultado;
8. repouso no estado completo.

O movimento usa `opacity`, `transform` e traços SVG. Não haverá timers React nem loop do
mapa.

## Contexto climático público

### Título e introdução

- Rótulo: **Contexto climático do território**.
- Título: **Quando o território muda, quem vive nele sente primeiro.**
- Introdução: **Dados públicos ajudam a dimensionar a pressão. O Angico organiza o que cada
  comunidade percebe, prioriza, faz e comprova no lugar.**
- Fronteira: **Contexto ambiental público. Estes números não representam resultados
  produzidos pelo Angico.**

### Composição

A seção recupera a hierarquia do slide “O problema em números”, sem copiar uma grade SaaS:

- um registro principal ocupa a região maior à esquerda;
- três registros compactos formam um ledger à direita;
- linhas, códigos, período e fonte criam continuidade editorial;
- no mobile, os quatro registros formam uma sequência vertical;
- cada indicador termina com “No território”, traduzindo a escala nacional em sinais locais.

### Indicador 1 — deslocamento climático

- Título editorial: **Exílio climático**.
- Código: `DESLOCAMENTO / RS / 2024`.
- Valor visual: **775 mil**.
- Unidade: **deslocamentos internos**.
- Texto: **As enchentes no Rio Grande do Sul provocaram cerca de 775 mil deslocamentos em
  2024.**
- No território: **abrigos, rotas interrompidas e famílias obrigadas a sair.**
- Fonte: **IDMC — Global Report on Internal Displacement 2025**.
- URL:
  `https://www.internal-displacement.org/spotlights/brazil-floods-in-rio-grande-do-sul-trigger-record-displacement/`
- Ressalva: **“Deslocamentos” contabiliza movimentos, não necessariamente pessoas únicas.**
- A expressão editorial “exílio climático” pode introduzir o tema, mas a unidade técnica
  visível será “deslocamentos internos”.

### Indicador 2 — El Niño e seca

- Título editorial: **El Niño e seca**.
- Código: `SECA / BRASIL / 2023–2024`.
- Valor visual: **60%**.
- Unidade: **do território brasileiro**.
- Texto: **Entre 2023 e 2024, uma seca extensa e intensa atingiu cerca de 60% do Brasil. O
  Cemaden registra que o episódio se intensificou sob influência do El Niño e do aquecimento
  do Atlântico Tropical Norte.**
- No território: **falta de água, solo seco, calor e áreas produtivas sob pressão.**
- Fontes:
  - **Cemaden/MCTI — extensão da seca em 2023–2024**:
    `https://www.gov.br/cemaden/pt-br/assuntos/noticias-cemaden/entre-2023-e-2024-cerca-de-60-do-territorio-brasileiro-foi-afetado-seca-extensa-e-intensa-aponta-nota-tecnica-do-cemaden`
  - **Cemaden/MCTI — diagnóstico das secas e condicionantes climáticos**:
    `https://www.gov.br/cemaden/pt-br/assuntos/noticias-cemaden/cemaden-analisa-secas-recentes-no-brasil-e-apresenta-diagnostico-e-projecoes-como-subsidio-para-a-cop-16`
- Ressalva: **Os 60% não são atribuídos exclusivamente ao El Niño; o Cemaden também aponta
  o aquecimento do Atlântico Tropical Norte.**

### Indicador 3 — calor sem sombra

- Título editorial: **Calor sem sombra**.
- Código: `ARBORIZAÇÃO / BRASIL URBANO / CENSO 2022`.
- Valor visual: **58,7 mi**.
- Unidade: **pessoas em vias sem arborização**.
- Texto: **O Censo 2022 encontrou 58,7 milhões de pessoas morando em vias urbanas sem
  arborização, 33,7% dos moradores avaliados.**
- No território: **pontos de calor, falta de sombra e caminhos hostis para caminhar.**
- Fonte: **IBGE — Características Urbanísticas do Entorno dos Domicílios**.
- URL: `https://educa.ibge.gov.br/criancas/voce-sabia/22715-entorno-dos-domicilios.html`
- Ressalva: **O indicador descreve o entorno da via do domicílio; não mede temperatura,
  cobertura de copa ou qualidade da arborização.**

### Indicador 4 — risco municipal

- Título editorial: **O risco já é local**.
- Código: `DESASTRES HÍDRICOS / BRASIL / 1991–2024`.
- Valor visual: **5.097**.
- Unidade: **municípios com ao menos um registro**.
- Texto: **Mais de 91% dos municípios registraram ao menos um desastre relacionado à água;
  o conjunto analisado impactou diretamente cerca de 129,8 milhões de brasileiros.**
- No território: **alagamentos, drenagem, danos, resposta e lacunas de prevenção.**
- Fonte: **Cemaden/MCTI — desastres relacionados à água no Brasil**.
- URL:
  `https://www.gov.br/cemaden/pt-br/assuntos/noticias-cemaden/desastres-relacionados-a-agua-no-brasil-aumentam-nas-ultimas-tres-decadas-e-ja-afetaram-quase-130-milhoes-de-pessoas`
- Ressalva: **Parte do crescimento dos registros reflete a ampliação da capacidade de
  notificação; o período não deve ser lido como crescimento climático puro.**

### Snapshot local

Os indicadores serão versionados em `apps/site/src/data/environmentalIndicators.ts`.

Interface prevista:

```ts
export interface EnvironmentalIndicator {
  id: 'displacement' | 'drought' | 'shade' | 'water-disasters';
  title: string;
  code: string;
  value: string;
  unit: string;
  statement: string;
  localSignal: string;
  geography: string;
  period: string;
  caveat: string;
  sources: readonly [
    { readonly label: string; readonly url: `https://${string}` },
    ...{ readonly label: string; readonly url: `https://${string}` }[]
  ];
}
```

O snapshot exibirá **Atualizado em julho de 2026**. A página não consulta as fontes ao abrir.
Se um link externo estiver indisponível, o conteúdo local continua legível.

Uma atualização futura deve alterar, no mesmo commit, valor, unidade, geografia, período,
fonte, ressalva, data de atualização e expectativas de teste. Um número não pode ser
atualizado isoladamente da evidência que o sustenta.

## AnimatedLeafFooter

### Quantidade e composição

- Renderizar exatamente **12 folhas** com o ativo oficial já versionado.
- Usar uma lista determinística de descritores; não usar `Math.random()`.
- Distribuir folhas por toda a largura do footer.
- Variar tamanho, opacidade, duração, atraso e rotação.
- Usar três trajetórias coerentes: esquerda, centro e direita.
- Usar atrasos negativos para que várias folhas já estejam no percurso quando o footer entrar
  na viewport.
- Manter as folhas atrás de marca, frase e links.
- Nenhuma folha pode cobrir foco, reduzir contraste ou capturar ponteiro.

Faixas-alvo:

- tamanho: 26–72 px;
- duração: 7,8–12,4 s;
- opacidade máxima: 0,18–0,62;
- ao menos três folhas visíveis simultaneamente em movimento normal;
- cada folha reinicia somente depois de sair da área visível.

### Movimento reduzido

Sob `prefers-reduced-motion: reduce`:

- nenhuma folha anima;
- quatro folhas ficam distribuídas como composição estática;
- oito folhas ficam ocultas;
- o conteúdo e os links do footer permanecem inalterados.

## Arquitetura de componentes

### `TerritoryHero`

Responsável pela composição 38/62, copy e CTA. Não contém geometria SVG e não recebe dados
climáticos.

### `TerritoryAtlas`

Substitui a responsabilidade atual de `TerritoryStoryMap`. Contém prancha, SVG, legenda,
Rastro e classes de movimento. Não conhece fontes climáticas nem configuração de ambiente.

### `EnvironmentalContext`

Renderiza os quatro indicadores a partir do snapshot local, incluindo fonte, período,
geografia, ressalvas e tradução local.

### `environmentalIndicators.ts`

É a única fonte interna para valores e metadados públicos. Não acessa backend nem browser
APIs.

### `AnimatedLeafFooter`

Renderiza conteúdo essencial e a lista determinística de doze folhas.

### Componentes preservados

- `Site` continua compondo a página e recebe apenas `appUrl` e `contactApiUrl`.
- `WhyAngico` continua explicando diferenciais e percurso.
- `ContactSection` preserva envio, falha, indisponibilidade e valores preenchidos.

## Fluxo de dados

```text
environmentalIndicators.ts
        │
        ▼
EnvironmentalContext ──► valor + período + fonte + ressalva

conteúdo demonstrativo local
        │
        ▼
TerritoryAtlas ─────────► SVG + legenda + Rastro

descritores de folhas
        │
        ▼
AnimatedLeafFooter ─────► 12 spans + variáveis CSS
```

Não há `fetch`, geolocalização, tile, analytics ou persistência nova nesse fluxo.

## Estados de erro e fronteiras

- Um link de fonte abre a fonte original em nova aba, com nome acessível,
  `target="_blank"` e `rel="noreferrer"`.
- Nenhum logo, script, imagem ou estilo é carregado dos domínios das fontes.
- A indisponibilidade temporária de uma fonte não remove o indicador local.
- Sem `appUrl`, o comportamento atual de acesso de membros continua explícito.
- Sem `contactApiUrl`, o contato continua exibindo indisponibilidade.
- Nenhum dado operacional é usado como fallback para os indicadores públicos.
- Nenhum indicador público aparece sobre o atlas demonstrativo como se pertencesse àquele
  território.

## Acessibilidade

- O SVG permanece `aria-hidden`.
- Atlas, camadas e Rastro recebem equivalente textual adjacente.
- Números não aparecem sem unidade, período e geografia.
- Links de fonte informam o nome da instituição e o indicador relacionado.
- Cor nunca é o único diferenciador de camada; usar padrão, forma e rótulo.
- A ordem DOM acompanha a leitura visual.
- Foco visível, skip link, landmarks e navegação por teclado permanecem.
- Zoom de texto não cria corte do atlas ou sobreposição.
- Movimento reduzido revela imediatamente o estado completo do mapa.

## Responsividade

Viewports contratuais:

- `320 × 800`;
- `375 × 812`;
- `430 × 932`;
- `720 × 900`;
- `768 × 1024`;
- `834 × 1112`;
- `1024 × 1024`;
- `1100 × 1000`;
- `1440 × 1000`;
- **`1538 × 789`**, correspondente ao screenshot que revelou o corte.

Em todos:

- nenhum overflow horizontal;
- CTA inteiramente visível;
- SVG integral dentro da prancha;
- legenda e Rastro sem cobrir o mapa;
- fontes climáticas legíveis;
- folhas contidas no footer.

## Desempenho

- Nenhuma dependência nova.
- JavaScript permanece no limite atual de `225000` bytes.
- CSS permanece no limite atual de `16000` bytes.
- O redesign deve substituir regras antigas de mapa/footer, não apenas acumular overrides.
- Qualquer aumento de orçamento exige aprovação separada.
- SVG, padrões e folhas reutilizam conteúdo local.
- Sem listeners globais ou animação controlada por estado React.

## Estratégia de testes

### TDD de componentes

- `environmentalIndicators.test.ts` falha primeiro sem os quatro registros e seus metadados.
- `EnvironmentalContext.test.tsx` falha primeiro sem valor, período, unidade, fonte e fronteira
  “não representa resultado do Angico”.
- `TerritoryAtlas.test.tsx` falha primeiro sem escala, norte, grade, camadas, legenda e Rastro.
- `AnimatedLeafFooter.test.tsx` falha primeiro enquanto houver apenas uma folha; passa com
  exatamente doze e conteúdo essencial preservado.

### E2E

- Adicionar o projeto `desktop-short` em `1538 × 789`.
- Verificar que CTA, prancha, SVG, legenda e Rastro cabem sem corte.
- Verificar que `preserveAspectRatio` usa `meet` e que todos os elementos essenciais ficam
  dentro da prancha.
- Verificar ausência de interseção entre copy, atlas, Rastro e fontes.
- Verificar os quatro indicadores e URLs exatas.
- Verificar que a página não carrega recursos externos; fontes só são abertas por navegação
  explícita.
- Verificar exatamente doze folhas e ao menos três visíveis durante movimento normal.
- Verificar que cada trajetória termina abaixo do footer antes do reinício.
- Verificar quatro folhas estáticas e zero animações em movimento reduzido.
- Preservar axe sem violações sérias ou críticas e a sequência completa de teclado.

### Inspeção visual

Capturas obrigatórias:

- desktop `1538 × 789`;
- desktop `1440 × 1000`;
- tablet `834 × 1112`;
- mobile `375 × 812`;
- footer em movimento normal;
- footer em movimento reduzido.

## Gates de entrega

- `npm run check`;
- testes RED e GREEN registrados por tarefa;
- `npm run build`;
- `npm run test:budget`;
- `npm run budget`;
- `npm run e2e` em todos os dez viewports;
- `npm audit --audit-level=high` sem regressão;
- `git diff --check`;
- revisão independente do diff completo;
- árvore rastreada limpa.

## Critérios de aceitação

- O mapa não funciona mais como fundo e aparece integralmente no screenshot `1538 × 789`.
- O atlas possui densidade cartográfica, hierarquia, legenda, escala, norte e Rastro legível.
- Copy, CTA, mapa, legenda e Rastro não se sobrepõem em nenhum viewport contratual.
- A seção climática usa deslocamento, El Niño/seca, arborização e desastres municipais.
- Cada indicador mostra valor, unidade, geografia, período e fonte.
- O texto distingue contexto público de resultado do Angico.
- Nenhum dado privado, operacional ou inventado é exibido.
- O footer contém doze folhas com fluxo contínuo e ritmos diferentes.
- Movimento reduzido mantém quatro folhas estáticas e o atlas completo.
- Login, autenticação e contato permanecem funcionalmente intactos.
- Não há dependências novas nem regressão dos orçamentos atuais.
