# Angico Atlas Territorial and Climate Context Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the cropped map-as-background hero with a fully framed territorial atlas, add a source-backed local climate context ledger, and turn the footer into a continuous deterministic field of twelve falling Angico leaves.

**Architecture:** `TerritoryHero` becomes a real copy/atlas grid and delegates the complete demonstrative map to `TerritoryAtlas`. `EnvironmentalContext` renders a versioned local evidence snapshot from `environmentalIndicators.ts`, while `AnimatedLeafFooter` renders twelve deterministic CSS-driven leaves. No new dependency, runtime data request, private workspace data, or authenticated application code enters `apps/site`.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Vitest 4, Testing Library, Playwright 1.61, inline SVG, CSS animations.

## Global Constraints

- Limit tracked changes to `apps/site` plus this plan/spec documentation; Task 6 may write ignored evidence under `.superpowers/sdd`.
- Do not modify `apps/app`, `apps/api`, login, authentication, authorization, or private workspace data.
- Do not add npm dependencies, remote tiles, maps, scripts, fonts, images, geolocation, or runtime indicator fetches.
- Keep JavaScript at or below `225000` production bytes.
- Keep CSS at or below `16000` production bytes; target `15600` bytes or less by replacing old hero/map/footer rules instead of stacking overrides.
- Preserve the existing contact behavior, member-access boundary, skip link, focus behavior, and public/authenticated separation.
- Keep the atlas explicitly demonstrative and climate indicators explicitly public context, never results produced by Angico.
- Preserve exact approved copy, values, units, periods, source URLs, and caveats from the design spec.
- Use exactly twelve deterministic footer leaves; do not call `Math.random()`.
- Normal motion: atlas plays once; footer leaves loop only after leaving the visible footer.
- Reduced motion: atlas is complete, four leaves are static, eight leaves are hidden, and no animation runs.
- Support `320×800`, `375×812`, `430×932`, `720×900`, `768×1024`, `834×1112`, `1024×1024`, `1100×1000`, `1440×1000`, and `1538×789`.
- Every production behavior begins with a focused failing test and recorded expected RED output.
- Use Node `>=22 <23`, matching `apps/site/package.json`.

## File Responsibility Map

**Create**

- `apps/site/src/data/environmentalIndicators.ts` — immutable, typed public evidence snapshot.
- `apps/site/src/data/environmentalIndicators.test.ts` — exact values, periods, caveats, and source integrity.
- `apps/site/src/components/EnvironmentalContext.tsx` — accessible climate context ledger.
- `apps/site/src/components/EnvironmentalContext.test.tsx` — public-context boundary and source-link behavior.
- `apps/site/src/components/TerritoryAtlas.tsx` — complete demonstrative atlas, legend, and Rastro.
- `apps/site/src/components/TerritoryAtlas.test.tsx` — atlas semantic and cartographic contract.

**Modify**

- `apps/site/src/Site.tsx` — compose climate context immediately after the hero.
- `apps/site/src/Site.test.tsx` — integration order, atlas label, public context.
- `apps/site/src/components/TerritoryHero.tsx` — real copy/atlas layout.
- `apps/site/src/components/TerritoryHero.test.tsx` — hero copy, CTA, and atlas boundary.
- `apps/site/src/components/AnimatedLeafFooter.tsx` — twelve deterministic descriptors.
- `apps/site/src/components/AnimatedLeafFooter.test.tsx` — count, paths, variables, and essential content.
- `apps/site/src/styles.css` — replace old map/footer layout and motion, add climate ledger.
- `apps/site/playwright.config.ts` — add `desktop-short` at `1538×789`.
- `apps/site/e2e/site.spec.ts` — geometry, sources, keyboard, motion, reduced motion, sweep.

**Delete after replacement**

- `apps/site/src/components/TerritoryStoryMap.tsx`
- `apps/site/src/components/TerritoryStoryMap.test.tsx`

**Preserve**

- `apps/site/src/components/ContactSection.tsx`
- `apps/site/src/components/WhyAngico.tsx`
- `apps/site/src/main.tsx`
- `apps/site/package.json`
- `apps/site/package-lock.json`
- `apps/site/bundle-budget.json`
- `apps/site/scripts/check-bundle-budget.mjs`

---

## Execution Preflight

Before Task 1, invoke `superpowers:using-git-worktrees` and create an isolated worktree on branch `feat/angico-atlas-climate-context` from the committed plan HEAD. Do not execute inside another chat's worktree.

Run from the new worktree root and persist the literal `BASE_SHA` as ignored evidence for Task 6:

```bash
mkdir -p .superpowers/sdd
git check-ignore -q .superpowers/sdd/atlas-climate-base-sha.txt
export BASE_SHA="$(git rev-parse HEAD)"
git rev-parse "$BASE_SHA"
git branch --show-current
git status --short --branch
```

Expected: branch `feat/angico-atlas-climate-context`, a clean tracked tree, and one immutable 40-character base SHA. Immediately use `apply_patch` to create ignored `.superpowers/sdd/atlas-climate-base-sha.txt` containing exactly that SHA plus one newline; do not use shell redirection or `tee`. Never recompute the base from a live branch name.

Then run the unchanged baseline from `apps/site`:

```bash
npm run verify
npm run build
npm run budget
```

Expected: all baseline gates pass and the recorded CSS result is `15727/16000` before any redesign work.

Budget feasibility was checked before approval with the repository's installed Lightning CSS: the exact atlas, climate, and footer blocks below minify to approximately `3703 + 1723 + 1772` bytes. Replacing the old target rules in memory projected a conservative final bundled CSS near `15577/16000`, including the existing font declarations. Treat this as a forecast only; every CSS task still runs the real Vite build and budget gate, and no task may raise the limit.

---

### Task 1: Version the Public Climate Evidence Snapshot

**Files:**

- Create: `apps/site/src/data/environmentalIndicators.test.ts`
- Create: `apps/site/src/data/environmentalIndicators.ts`

**Interfaces:**

- Produces: `EnvironmentalIndicatorId`, `HttpsUrl`, `EnvironmentalSource`, `EnvironmentalIndicator`, `ENVIRONMENTAL_INDICATORS_UPDATED_LABEL`, `ENVIRONMENTAL_CONTEXT_BOUNDARY`, and `environmentalIndicators`.
- Consumed by: Task 3 `EnvironmentalContext` and Task 5 E2E source checks.

- [ ] **Step 1: Write the failing snapshot integrity test**

Create `apps/site/src/data/environmentalIndicators.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  ENVIRONMENTAL_CONTEXT_BOUNDARY,
  ENVIRONMENTAL_INDICATORS_UPDATED_LABEL,
  environmentalIndicators
} from './environmentalIndicators';

describe('environmentalIndicators', () => {
  it('versions values, periods, caveats and sources as one evidence snapshot', () => {
    expect(ENVIRONMENTAL_INDICATORS_UPDATED_LABEL).toBe('Atualizado em julho de 2026');
    expect(ENVIRONMENTAL_CONTEXT_BOUNDARY).toBe(
      'Contexto ambiental público. Estes números não representam resultados produzidos pelo Angico.'
    );

    expect(environmentalIndicators).toEqual([
      {
        id: 'displacement',
        title: 'Exílio climático',
        code: 'DESLOCAMENTO / RS / 2024',
        value: '775 mil',
        unit: 'deslocamentos internos',
        statement:
          'As enchentes no Rio Grande do Sul provocaram cerca de 775 mil deslocamentos em 2024.',
        localSignal: 'abrigos, rotas interrompidas e famílias obrigadas a sair.',
        geography: 'Rio Grande do Sul',
        period: '2024',
        caveat: '“Deslocamentos” contabiliza movimentos, não necessariamente pessoas únicas.',
        sources: [
          {
            label: 'IDMC — Global Report on Internal Displacement 2025',
            url: 'https://www.internal-displacement.org/spotlights/brazil-floods-in-rio-grande-do-sul-trigger-record-displacement/'
          }
        ]
      },
      {
        id: 'drought',
        title: 'El Niño e seca',
        code: 'SECA / BRASIL / 2023–2024',
        value: '60%',
        unit: 'do território brasileiro',
        statement:
          'Entre 2023 e 2024, uma seca extensa e intensa atingiu cerca de 60% do Brasil. O Cemaden registra que o episódio se intensificou sob influência do El Niño e do aquecimento do Atlântico Tropical Norte.',
        localSignal: 'falta de água, solo seco, calor e áreas produtivas sob pressão.',
        geography: 'Brasil',
        period: '2023–2024',
        caveat:
          'Os 60% não são atribuídos exclusivamente ao El Niño; o Cemaden também aponta o aquecimento do Atlântico Tropical Norte.',
        sources: [
          {
            label: 'Cemaden/MCTI — extensão da seca em 2023–2024',
            url: 'https://www.gov.br/cemaden/pt-br/assuntos/noticias-cemaden/entre-2023-e-2024-cerca-de-60-do-territorio-brasileiro-foi-afetado-seca-extensa-e-intensa-aponta-nota-tecnica-do-cemaden'
          },
          {
            label: 'Cemaden/MCTI — diagnóstico das secas e condicionantes climáticos',
            url: 'https://www.gov.br/cemaden/pt-br/assuntos/noticias-cemaden/cemaden-analisa-secas-recentes-no-brasil-e-apresenta-diagnostico-e-projecoes-como-subsidio-para-a-cop-16'
          }
        ]
      },
      {
        id: 'shade',
        title: 'Calor sem sombra',
        code: 'ARBORIZAÇÃO / BRASIL URBANO / CENSO 2022',
        value: '58,7 mi',
        unit: 'pessoas em vias sem arborização',
        statement:
          'O Censo 2022 encontrou 58,7 milhões de pessoas morando em vias urbanas sem arborização, 33,7% dos moradores avaliados.',
        localSignal: 'pontos de calor, falta de sombra e caminhos hostis para caminhar.',
        geography: 'Brasil urbano',
        period: 'Censo 2022',
        caveat:
          'O indicador descreve o entorno da via do domicílio; não mede temperatura, cobertura de copa ou qualidade da arborização.',
        sources: [
          {
            label: 'IBGE — Características Urbanísticas do Entorno dos Domicílios',
            url: 'https://educa.ibge.gov.br/criancas/voce-sabia/22715-entorno-dos-domicilios.html'
          }
        ]
      },
      {
        id: 'water-disasters',
        title: 'O risco já é local',
        code: 'DESASTRES HÍDRICOS / BRASIL / 1991–2024',
        value: '5.097',
        unit: 'municípios com ao menos um registro',
        statement:
          'Mais de 91% dos municípios registraram ao menos um desastre relacionado à água; o conjunto analisado impactou diretamente cerca de 129,8 milhões de brasileiros.',
        localSignal: 'alagamentos, drenagem, danos, resposta e lacunas de prevenção.',
        geography: 'Brasil',
        period: '1991–2024',
        caveat:
          'Parte do crescimento dos registros reflete a ampliação da capacidade de notificação; o período não deve ser lido como crescimento climático puro.',
        sources: [
          {
            label: 'Cemaden/MCTI — desastres relacionados à água no Brasil',
            url: 'https://www.gov.br/cemaden/pt-br/assuntos/noticias-cemaden/desastres-relacionados-a-agua-no-brasil-aumentam-nas-ultimas-tres-decadas-e-ja-afetaram-quase-130-milhoes-de-pessoas'
          }
        ]
      }
    ]);
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run from `apps/site`:

```bash
npm test -- --run src/data/environmentalIndicators.test.ts
```

Expected: exit `1` because `./environmentalIndicators` does not exist. Confirm the failure names the missing evidence module, not a test syntax error.

- [ ] **Step 3: Implement the immutable typed snapshot**

Create `apps/site/src/data/environmentalIndicators.ts`:

```ts
export type EnvironmentalIndicatorId =
  | 'displacement'
  | 'drought'
  | 'shade'
  | 'water-disasters';

export type HttpsUrl = `https://${string}`;

export interface EnvironmentalSource {
  readonly label: string;
  readonly url: HttpsUrl;
}

export interface EnvironmentalIndicator {
  readonly id: EnvironmentalIndicatorId;
  readonly title: string;
  readonly code: string;
  readonly value: string;
  readonly unit: string;
  readonly statement: string;
  readonly localSignal: string;
  readonly geography: string;
  readonly period: string;
  readonly caveat: string;
  readonly sources: readonly [EnvironmentalSource, ...EnvironmentalSource[]];
}

export const ENVIRONMENTAL_INDICATORS_UPDATED_LABEL = 'Atualizado em julho de 2026';

export const ENVIRONMENTAL_CONTEXT_BOUNDARY =
  'Contexto ambiental público. Estes números não representam resultados produzidos pelo Angico.';

export const environmentalIndicators = [
  {
    id: 'displacement',
    title: 'Exílio climático',
    code: 'DESLOCAMENTO / RS / 2024',
    value: '775 mil',
    unit: 'deslocamentos internos',
    statement:
      'As enchentes no Rio Grande do Sul provocaram cerca de 775 mil deslocamentos em 2024.',
    localSignal: 'abrigos, rotas interrompidas e famílias obrigadas a sair.',
    geography: 'Rio Grande do Sul',
    period: '2024',
    caveat: '“Deslocamentos” contabiliza movimentos, não necessariamente pessoas únicas.',
    sources: [
      {
        label: 'IDMC — Global Report on Internal Displacement 2025',
        url: 'https://www.internal-displacement.org/spotlights/brazil-floods-in-rio-grande-do-sul-trigger-record-displacement/'
      }
    ]
  },
  {
    id: 'drought',
    title: 'El Niño e seca',
    code: 'SECA / BRASIL / 2023–2024',
    value: '60%',
    unit: 'do território brasileiro',
    statement:
      'Entre 2023 e 2024, uma seca extensa e intensa atingiu cerca de 60% do Brasil. O Cemaden registra que o episódio se intensificou sob influência do El Niño e do aquecimento do Atlântico Tropical Norte.',
    localSignal: 'falta de água, solo seco, calor e áreas produtivas sob pressão.',
    geography: 'Brasil',
    period: '2023–2024',
    caveat:
      'Os 60% não são atribuídos exclusivamente ao El Niño; o Cemaden também aponta o aquecimento do Atlântico Tropical Norte.',
    sources: [
      {
        label: 'Cemaden/MCTI — extensão da seca em 2023–2024',
        url: 'https://www.gov.br/cemaden/pt-br/assuntos/noticias-cemaden/entre-2023-e-2024-cerca-de-60-do-territorio-brasileiro-foi-afetado-seca-extensa-e-intensa-aponta-nota-tecnica-do-cemaden'
      },
      {
        label: 'Cemaden/MCTI — diagnóstico das secas e condicionantes climáticos',
        url: 'https://www.gov.br/cemaden/pt-br/assuntos/noticias-cemaden/cemaden-analisa-secas-recentes-no-brasil-e-apresenta-diagnostico-e-projecoes-como-subsidio-para-a-cop-16'
      }
    ]
  },
  {
    id: 'shade',
    title: 'Calor sem sombra',
    code: 'ARBORIZAÇÃO / BRASIL URBANO / CENSO 2022',
    value: '58,7 mi',
    unit: 'pessoas em vias sem arborização',
    statement:
      'O Censo 2022 encontrou 58,7 milhões de pessoas morando em vias urbanas sem arborização, 33,7% dos moradores avaliados.',
    localSignal: 'pontos de calor, falta de sombra e caminhos hostis para caminhar.',
    geography: 'Brasil urbano',
    period: 'Censo 2022',
    caveat:
      'O indicador descreve o entorno da via do domicílio; não mede temperatura, cobertura de copa ou qualidade da arborização.',
    sources: [
      {
        label: 'IBGE — Características Urbanísticas do Entorno dos Domicílios',
        url: 'https://educa.ibge.gov.br/criancas/voce-sabia/22715-entorno-dos-domicilios.html'
      }
    ]
  },
  {
    id: 'water-disasters',
    title: 'O risco já é local',
    code: 'DESASTRES HÍDRICOS / BRASIL / 1991–2024',
    value: '5.097',
    unit: 'municípios com ao menos um registro',
    statement:
      'Mais de 91% dos municípios registraram ao menos um desastre relacionado à água; o conjunto analisado impactou diretamente cerca de 129,8 milhões de brasileiros.',
    localSignal: 'alagamentos, drenagem, danos, resposta e lacunas de prevenção.',
    geography: 'Brasil',
    period: '1991–2024',
    caveat:
      'Parte do crescimento dos registros reflete a ampliação da capacidade de notificação; o período não deve ser lido como crescimento climático puro.',
    sources: [
      {
        label: 'Cemaden/MCTI — desastres relacionados à água no Brasil',
        url: 'https://www.gov.br/cemaden/pt-br/assuntos/noticias-cemaden/desastres-relacionados-a-agua-no-brasil-aumentam-nas-ultimas-tres-decadas-e-ja-afetaram-quase-130-milhoes-de-pessoas'
      }
    ]
  }
] as const satisfies readonly EnvironmentalIndicator[];
```

- [ ] **Step 4: Run the snapshot test and verify GREEN**

Run:

```bash
npm test -- --run src/data/environmentalIndicators.test.ts
```

Expected: `1` test passed, `0` failed.

- [ ] **Step 5: Run type and lint checks**

Run:

```bash
npm run lint
npm run typecheck
```

Expected: both exit `0`, with zero warnings.

- [ ] **Step 6: Commit the evidence snapshot**

```bash
git add apps/site/src/data/environmentalIndicators.ts \
  apps/site/src/data/environmentalIndicators.test.ts
git commit -m "feat(site): version public climate evidence"
```

---
### Task 2: Replace the Cropped Story Map with the Complete Territory Atlas

**Files:**

- Create: `apps/site/src/components/TerritoryAtlas.test.tsx`
- Create: `apps/site/src/components/TerritoryAtlas.tsx`
- Modify: `apps/site/src/components/TerritoryHero.test.tsx`
- Modify: `apps/site/src/components/TerritoryHero.tsx`
- Modify: `apps/site/src/Site.test.tsx`
- Modify: `apps/site/src/styles.css`
- Modify: `apps/site/playwright.config.ts`
- Modify: `apps/site/e2e/site.spec.ts`
- Delete: `apps/site/src/components/TerritoryStoryMap.tsx`
- Delete: `apps/site/src/components/TerritoryStoryMap.test.tsx`

**Interfaces:**

- Produces: default component `TerritoryAtlas(): JSX.Element` with `.atlas`, `.a-plate`, `.a-svg`, `.a-legend`, and `.trace`.
- Produces: `TerritoryHero(): JSX.Element` with `.h-layout`, `.h-copy`, and a sibling atlas.
- Produces compact motion hooks used by browser tests: `.map-base`, `.map-details`, `.a-marker`, `.a-route`.
- Consumes no props, runtime data, app URL, or environmental indicators.

- [ ] **Step 1: Write the failing semantic atlas tests**

Create `apps/site/src/components/TerritoryAtlas.test.tsx`:

```tsx
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import TerritoryAtlas from './TerritoryAtlas';

afterEach(cleanup);

describe('TerritoryAtlas', () => {
  it('frames a complete demonstrative atlas with cartographic marginalia', () => {
    const { container } = render(<TerritoryAtlas />);

    expect(
      screen.getByRole('figure', { name: 'Atlas demonstrativo — sem dados operacionais' })
    ).toHaveAccessibleDescription(
      'Prancha demonstrativa com limite territorial, relevo, área de drenagem, água, vegetação, fragmentos, cicatriz de fogo, caminhos, travessia, escola, praça, ponto comunitário, alagamento, calor, falta de sombra, grade, norte, escala e Rastro.'
    );
    expect(screen.getByText('Atlas demonstrativo — sem dados operacionais')).toBeInTheDocument();
    expect(screen.getByText(/Norte/)).toBeInTheDocument();
    expect(screen.getByText('0 · 250 · 500 m')).toBeInTheDocument();
    expect(screen.getByText('Grade A–D / 1–4')).toBeInTheDocument();

    const svg = container.querySelector('.a-svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 1200 760');
    expect(svg).toHaveAttribute('preserveAspectRatio', 'xMidYMid meet');
    expect(svg).toHaveAttribute('aria-hidden', 'true');

    for (const layer of ['drainage', 'water', 'vegetation', 'fragments', 'fire', 'paths', 'signals']) {
      expect(container.querySelector(`[data-layer="${layer}"]`)).toBeInTheDocument();
    }
    expect(container.querySelectorAll('[data-grid-axis]')).toHaveLength(8);
    expect(container).toHaveTextContent('Escola');
    expect(container).toHaveTextContent('Praça');
    expect(container).toHaveTextContent('Ponto comunitário');
    expect(container).toHaveTextContent('Travessia');
    expect(container).toHaveTextContent('Calor');
    expect(container).toHaveTextContent('Sem sombra');
  });

  it('keeps legend and the four-step Rastro outside the SVG semantics', () => {
    render(<TerritoryAtlas />);

    const legend = screen.getByRole('list', { name: 'Camadas do atlas demonstrativo' });
    expect(within(legend).getAllByRole('listitem')).toHaveLength(5);
    expect(within(legend).getByText('Água')).toBeInTheDocument();
    expect(within(legend).getByText('Vegetação')).toBeInTheDocument();
    expect(within(legend).getByText('Pressão')).toBeInTheDocument();
    expect(within(legend).getByText('Caminho')).toBeInTheDocument();
    expect(within(legend).getByText('Registro')).toBeInTheDocument();

    const trace = screen.getByRole('list', { name: 'Percurso demonstrativo do território' });
    const steps = within(trace).getAllByRole('listitem');
    expect(steps).toHaveLength(4);
    expect(within(steps[0]).getByText('Observação')).toBeInTheDocument();
    expect(within(steps[1]).getByText('Ação')).toBeInTheDocument();
    expect(within(steps[2]).getByText('Evidência')).toBeInTheDocument();
    expect(within(steps[3]).getByText('Resultado')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Sinais locais: escola · praça · ponto comunitário · travessia · alagamento · calor · falta de sombra'
      )
    ).toBeInTheDocument();
  });

  it('does not place public climate figures inside the demonstrative territory', () => {
    const { container } = render(<TerritoryAtlas />);
    expect(container).not.toHaveTextContent(/775 mil|58,7 mi|5\.097|60%/i);
  });
});
```

Replace `apps/site/src/components/TerritoryHero.test.tsx` with:

```tsx
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import TerritoryHero from './TerritoryHero';

afterEach(cleanup);

describe('TerritoryHero', () => {
  it('keeps approved copy and CTA in a region separate from the complete atlas', () => {
    const { container } = render(<TerritoryHero />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'O trabalho continua. A memória também.' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Quero levar o Angico ao meu território' })
    ).toHaveAttribute('href', '#contato');
    expect(screen.getByText('Atlas demonstrativo — sem dados operacionais')).toBeInTheDocument();
    expect(container.querySelector('.h-copy')).toBeInTheDocument();
    expect(container.querySelector('.atlas')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Já sou membro' })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run from `apps/site`:

```bash
npm test -- --run \
  src/components/TerritoryAtlas.test.tsx \
  src/components/TerritoryHero.test.tsx
```

Expected: exit `1`; `TerritoryAtlas.test.tsx` cannot resolve `./TerritoryAtlas`, and the hero still renders the old demonstration label.

- [ ] **Step 3: Implement the complete atlas component**

Create `apps/site/src/components/TerritoryAtlas.tsx` exactly as follows:

```tsx
const legendLayers = [
  { id: 'water', label: 'Água', color: '#34aba6' },
  { id: 'vegetation', label: 'Vegetação', color: '#2d8b73' },
  { id: 'pressure', label: 'Pressão', color: '#b7653b' },
  { id: 'path', label: 'Caminho', color: '#f5f2ec' },
  { id: 'record', label: 'Registro', color: '#004b6c' }
] as const;

const traceSteps = [
  { id: 'observation', title: 'Observação', description: 'O que foi percebido no lugar.' },
  { id: 'action', title: 'Ação', description: 'A resposta ligada à sua origem.' },
  { id: 'evidence', title: 'Evidência', description: 'Autoria e momento preservados.' },
  { id: 'result', title: 'Resultado', description: 'A mudança sem perder o percurso.' }
] as const;

export default function TerritoryAtlas() {
  return (
    <figure
      className="atlas"
      aria-labelledby="atlas-title"
      aria-describedby="atlas-summary"
    >
      <p id="atlas-summary" className="sr-only">
        Prancha demonstrativa com limite territorial, relevo, área de drenagem, água,
        vegetação, fragmentos, cicatriz de fogo, caminhos, travessia, escola, praça, ponto
        comunitário, alagamento, calor, falta de sombra, grade, norte, escala e Rastro.
      </p>
      <div className="a-plate">
        <span
          id="atlas-title"
          className="a-meta a-label"
        >
          Atlas demonstrativo — sem dados operacionais
        </span>
        <span className="a-meta a-north" aria-hidden="true">
          <b>↑</b> Norte
        </span>
        <span className="a-meta a-scale" aria-hidden="true">
          0 · 250 · 500 m
        </span>
        <span className="a-meta a-grid-label" aria-hidden="true">
          Grade A–D / 1–4
        </span>

        <svg
          className="a-svg"
          viewBox="0 0 1200 760"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <pattern id="atlas-grid" width="240" height="152" patternUnits="userSpaceOnUse">
              <path d="M240 0H0V152" fill="none" stroke="#8dac9f" strokeWidth="1" opacity=".28" />
            </pattern>
            <pattern id="fragment-pattern" width="34" height="30" patternUnits="userSpaceOnUse">
              <path d="m4 9 9-5 8 7-4 10-11-2Z" fill="#2d8b73" opacity=".58" />
              <path d="m23 21 6-3 4 5-5 5-6-2Z" fill="#75a092" opacity=".7" />
            </pattern>
            <pattern id="fire-pattern" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="m-4 18 28-14M2 26 30-2" stroke="#b7653b" strokeWidth="5" opacity=".66" />
            </pattern>
          </defs>

          <g className="map-base atlas-reveal">
            <rect width="1200" height="760" fill="#dfeae6" />
            <rect x="38" y="38" width="1124" height="684" fill="url(#atlas-grid)" />
            <g fill="#58756d" fontFamily="var(--font-label)" fontSize="16" textAnchor="middle">
              {['A', 'B', 'C', 'D'].map((label, index) => (
                <text data-grid-axis="column" x={180 + index * 280} y="28" key={label}>{label}</text>
              ))}
            </g>
            <g fill="#58756d" fontFamily="var(--font-label)" fontSize="16" textAnchor="middle">
              {['1', '2', '3', '4'].map((label, index) => (
                <text data-grid-axis="row" x="20" y={124 + index * 170} key={label}>{label}</text>
              ))}
            </g>
            <path
              d="M93 117 330 55l173 91 270-56 320 114-70 183 81 181-235 111-210-57-231 72-177-106 44-169-180-113Z"
              fill="#cfdfd8"
              stroke="#6f978b"
              strokeWidth="4"
            />
            <g fill="none" stroke="#8dac9f" strokeWidth="2" opacity=".58">
              <path d="M86 234c154-76 304-51 442 21s300 91 586-19" />
              <path d="M69 466c191-64 337-36 483 47s319 78 584-14" />
              <path d="M203 78c-23 139 30 230 12 352-14 103 0 182 59 281" />
              <path d="M725 62c-48 130-13 226 24 320 45 116 18 217-27 329" />
            </g>
          </g>

          <g
            className="map-details atlas-reveal"
            style={{ animationDelay: '.8s' }}
          >
            <path
              data-layer="drainage"
              d="M92 128c210 28 298 214 470 226 190 13 277-154 527-100l40 170c-236-74-356 96-558 82C351 491 238 277 65 248Z"
              fill="#34aba6"
              fillOpacity=".1"
              stroke="#34aba6"
              strokeDasharray="12 10"
              strokeWidth="3"
            />
            <g data-layer="water" fill="none" strokeLinecap="round">
              <path
                d="M69 166c175 65 217 190 391 203 205 16 257-154 448-132 94 11 167 59 253 106"
                stroke="#f7f4ee"
                strokeWidth="43"
              />
              <path
                d="M69 166c175 65 217 190 391 203 205 16 257-154 448-132 94 11 167 59 253 106"
                stroke="#34aba6"
                strokeWidth="11"
              />
              <path d="M290 110c48 83 89 132 170 259" stroke="#34aba6" strokeWidth="6" />
              <path d="M909 237c-18 66-43 110-91 166" stroke="#34aba6" strokeWidth="6" />
            </g>

            <g data-layer="paths" fill="none" stroke="#f8f5ef" strokeWidth="14" strokeDasharray="22 12">
              <path d="M103 676c145-159 245-241 406-292 199-64 329-203 589-294" />
              <path d="M175 78c110 159 218 226 253 400 23 112 116 176 286 226" />
            </g>

            <g data-layer="vegetation">
              <path
                d="m156 389 191-88 118 91-47 162-191 45-123-111Z"
                fill="#68af8e"
                fillOpacity=".58"
                stroke="#2d8b73"
                strokeWidth="3"
              />
              <path
                d="m725 421 201-82 143 88-59 154-189 33-132-94Z"
                fill="#e8d6a8"
                fillOpacity=".7"
                stroke="#9a7832"
                strokeWidth="3"
              />
            </g>

            <path
              data-layer="fragments"
              d="M466 164h173v126H493l-48-51Z"
              fill="url(#fragment-pattern)"
              stroke="#2d8b73"
              strokeWidth="2"
            />
            <path
              data-layer="fire"
              d="m848 116 160 36 59 97-126 38-118-55Z"
              fill="url(#fire-pattern)"
              stroke="#b7653b"
              strokeWidth="3"
            />

            <g
              fill="#3c4f54"
              fontFamily="var(--font-label)"
              fontSize="17"
              letterSpacing="1"
            >
              <text x="696" y="208">Curso d'água</text>
              <text x="137" y="654">Caminho local</text>
              <text x="172" y="455">Área acompanhada</text>
              <text x="782" y="493">Zona de cuidado</text>
              <text x="470" y="151">Fragmentos</text>
              <text x="895" y="110">Cicatriz de fogo</text>
            </g>
          </g>

          <g
            data-layer="signals"
            className="a-signals atlas-reveal"
            style={{ animationDelay: '1.35s' }}
          >
            <g transform="translate(374 190)">
              <circle r="17" fill="#2d8b73" />
              <path d="M-8 5h16M-5 1h10M-2-3h4" stroke="#fff" strokeWidth="3" />
              <text x="25" y="6" fill="#3c4f54" fontFamily="var(--font-label)" fontSize="16">Praça</text>
            </g>
            <g transform="translate(252 540)">
              <circle r="17" fill="#004b6c" />
              <path d="M-6 2h12M0-6v12" stroke="#fff" strokeWidth="3" />
              <text x="25" y="6" fill="#3c4f54" fontFamily="var(--font-label)" fontSize="16">Escola</text>
            </g>
            <g transform="translate(694 322)">
              <rect x="-16" y="-11" width="32" height="22" fill="#f7f4ee" stroke="#004b6c" strokeWidth="3" />
              <path d="M-11-5h22M-11 5h22" stroke="#34aba6" strokeWidth="3" />
              <text x="25" y="6" fill="#3c4f54" fontFamily="var(--font-label)" fontSize="16">Travessia</text>
            </g>
            <g transform="translate(522 599)">
              <circle r="17" fill="#34aba6" />
              <path d="m-7 5 5-10 4 7 5-4" fill="none" stroke="#fff" strokeWidth="3" />
              <text x="25" y="6" fill="#3c4f54" fontFamily="var(--font-label)" fontSize="16">Alagamento</text>
            </g>
            <g transform="translate(785 655)">
              <circle r="17" fill="#004b6c" />
              <path d="M-8 6V-4l8-6 8 6V6M-3 6V0h6v6" fill="none" stroke="#fff" strokeWidth="3" />
              <text x="25" y="6" fill="#3c4f54" fontFamily="var(--font-label)" fontSize="16">Ponto comunitário</text>
            </g>
            <g transform="translate(1042 432)">
              <circle r="17" fill="#b7653b" />
              <path d="M-7 4 0-8 7 4Z" fill="none" stroke="#fff" strokeWidth="3" />
              <text x="-58" y="35" fill="#3c4f54" fontFamily="var(--font-label)" fontSize="16">Calor</text>
            </g>
            <g transform="translate(1000 540)">
              <circle r="17" fill="#b7653b" fillOpacity=".82" />
              <path d="M-8 2h16M-5-4h10M-2-9h4" stroke="#fff" strokeWidth="3" />
              <text x="25" y="6" fill="#3c4f54" fontFamily="var(--font-label)" fontSize="16">Sem sombra</text>
            </g>
          </g>

          <g className="a-trace" fontWeight="700">
            <path className="a-route a-route--one" style={{ animationDelay: '2.6s' }} pathLength="1" d="M620 536C681 485 727 447 776 405" />
            <path className="a-route a-route--two" style={{ animationDelay: '3.4s' }} pathLength="1" d="M776 405C825 381 870 360 916 344" />
            <path className="a-route a-route--three" style={{ animationDelay: '4.2s' }} pathLength="1" d="M916 344C966 324 1014 303 1062 280" />

            <g className="a-marker a-marker--observation atlas-reveal" style={{ animationDelay: '1.8s' }}>
              <circle cx="620" cy="536" r="24" fill="#34aba6" />
              <text x="620" y="542">1</text>
            </g>
            <g className="a-marker a-marker--action atlas-reveal" style={{ animationDelay: '2.6s' }}>
              <rect x="755" y="384" width="42" height="42" fill="#003952" transform="rotate(45 776 405)" />
              <text x="776" y="411">2</text>
            </g>
            <g className="a-marker a-marker--evidence atlas-reveal" style={{ animationDelay: '3.4s' }}>
              <circle cx="916" cy="344" r="24" fill="#004b6c" />
              <circle cx="916" cy="344" r="9" fill="#fff" opacity=".4" />
              <text x="916" y="350">3</text>
            </g>
            <g className="a-marker a-marker--result atlas-reveal" style={{ animationDelay: '4.2s' }}>
              <path d="m1062 251 29 29-29 29-29-29Z" fill="#003952" />
              <text x="1062" y="286">4</text>
            </g>
          </g>
        </svg>
      </div>

      <p className="a-features">
        Sinais locais: escola · praça · ponto comunitário · travessia · alagamento · calor · falta de sombra
      </p>

      <ul className="a-legend" aria-label="Camadas do atlas demonstrativo">
        {legendLayers.map((layer) => (
          <li key={layer.id} data-legend={layer.id}>
            <span aria-hidden="true" style={{ background: layer.color }} />
            {layer.label}
          </li>
        ))}
      </ul>

      <figcaption className="trace">
        <span className="t-label">Rastro demonstrativo</span>
        <ol aria-label="Percurso demonstrativo do território">
          {traceSteps.map((step, index) => (
            <li className={`t-step t-step--${step.id}`} key={step.id}>
              <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <strong>{step.title}</strong>
              <small>{step.description}</small>
            </li>
          ))}
        </ol>
      </figcaption>
    </figure>
  );
}
```

- [ ] **Step 4: Compose the atlas as a sibling of the hero copy**

Replace `apps/site/src/components/TerritoryHero.tsx` with:

```tsx
import TerritoryAtlas from './TerritoryAtlas';

export default function TerritoryHero() {
  return (
    <section id="inicio" className="hero" aria-labelledby="hero-title">
      <div className="site-frame h-layout">
        <div className="h-copy">
          <p className="eyebrow">— Memória operacional socioambiental</p>
          <h1 id="hero-title">O trabalho continua. A memória também.</h1>
          <p className="h-summary">
            O Angico conecta território, autoria, evidência e resultado para que uma ação possa
            ser retomada, compreendida e demonstrada ao longo do tempo.
          </p>
          <a className="primary-action" href="#contato">
            Quero levar o Angico ao meu território
          </a>
        </div>

        <TerritoryAtlas />
      </div>
    </section>
  );
}
```

In `apps/site/src/Site.test.tsx`, replace the old map-label expectation with:

```ts
expect(screen.getByText('Atlas demonstrativo — sem dados operacionais')).toBeInTheDocument();
```

Delete `TerritoryStoryMap.tsx` and `TerritoryStoryMap.test.tsx` only after `TerritoryHero` imports `TerritoryAtlas`.

- [ ] **Step 5: Run semantic tests and verify GREEN before styling**

Run:

```bash
npm test -- --run \
  src/components/TerritoryAtlas.test.tsx \
  src/components/TerritoryHero.test.tsx \
  src/Site.test.tsx
```

Expected: all focused tests pass. The page is not yet visually accepted; the next RED contract covers layout.

- [ ] **Step 6: Add the short-desktop project and write the failing geometry contract**

In `apps/site/playwright.config.ts`, use this complete viewport list:

```ts
const viewports = [
  { name: 'mobile-320', width: 320, height: 800 },
  { name: 'mobile-375', width: 375, height: 812 },
  { name: 'mobile-430', width: 430, height: 932 },
  { name: 'boundary-720', width: 720, height: 900 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'tablet-834', width: 834, height: 1112 },
  { name: 'desktop-1024', width: 1024, height: 1024 },
  { name: 'desktop-1100', width: 1100, height: 1000 },
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'desktop-short', width: 1538, height: 789 }
];
```

Append this test to `apps/site/e2e/site.spec.ts` before changing CSS:

```ts
test('fully frames the atlas in the short desktop viewport', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-short');
  await page.goto('/');

  const geometry = await page.locator('.hero').evaluate((hero) => {
    const rect = (selector: string) => {
      const element = hero.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      const { top, right, bottom, left, width, height } = element.getBoundingClientRect();
      return { top, right, bottom, left, width, height };
    };

    return {
      hero: rect('.h-layout'),
      copy: rect('.h-copy'),
      atlas: rect('.atlas'),
      plate: rect('.a-plate'),
      svg: rect('.a-svg'),
      legend: rect('.a-legend'),
      trace: rect('.trace'),
      cta: rect('.primary-action'),
      viewportHeight: window.innerHeight
    };
  });

  await expect(page.locator('.a-svg')).toHaveAttribute(
    'preserveAspectRatio',
    'xMidYMid meet'
  );
  expect(geometry.copy.right).toBeLessThanOrEqual(geometry.atlas.left);
  expect(geometry.svg.left).toBeGreaterThanOrEqual(geometry.plate.left);
  expect(geometry.svg.right).toBeLessThanOrEqual(geometry.plate.right);
  expect(geometry.svg.top).toBeGreaterThanOrEqual(geometry.plate.top);
  expect(geometry.svg.bottom).toBeLessThanOrEqual(geometry.plate.bottom);
  expect(geometry.plate.bottom).toBeLessThanOrEqual(geometry.legend.top);
  expect(geometry.legend.bottom).toBeLessThanOrEqual(geometry.trace.top);
  expect(geometry.cta.bottom).toBeLessThanOrEqual(geometry.viewportHeight);
  expect(geometry.trace.bottom).toBeLessThanOrEqual(geometry.viewportHeight);
});
```

- [ ] **Step 7: Run the short-desktop contract and verify RED**

Run:

```bash
npm run e2e -- --project=desktop-short --grep "fully frames the atlas"
```

Expected: exit `1` because the new classes still have no complete layout and the old overlay/absolute rules do not satisfy the ordered geometry.

- [ ] **Step 8: Replace old hero/map/Rastro CSS instead of adding overrides**

In the shared label selector, remove `.territory-map__demo-label` and replace `.territory-trace__label` with `.t-label`. Remove the current CSS blocks from `.territory-hero` through `.territory-trace__step small`, remove the obsolete `@media (min-width: 721px)` trace transform, remove the old `.territory-hero::after` gradient from `@media (max-width: 960px)`, and remove the old mobile map positioning rules. Also remove the old `map-base-reveal`, `map-detail-reveal`, `trace-marker-reveal`, and `trace-route-draw` keyframes plus their map/marker/route declarations inside the existing no-preference media query. Remove the old reduced-motion map/route declarations as well; preserve only the old footer leaf declaration until Task 4. Replace the removed atlas-related CSS with this exact block, using the shorter component classes to protect the fixed CSS budget:

```css
.sr-only { width: 1px; height: 1px; padding: 0; position: absolute; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }

.hero { color: #fff; background: var(--brand-deep); }
.h-layout { min-height: calc(100svh - 82px); padding-block: clamp(34px,4vw,56px); display: grid; align-items: center; gap: clamp(32px,5vw,72px); }
.h-copy { min-width: 0; }
.hero h1 { color: #fff; }
.hero h1 { max-width: 8.5ch; margin: 18px 0 22px; font-size: clamp(3rem,4.7vw,4.75rem); }
.h-summary { max-width: 50ch; margin-bottom: 26px; color: rgba(255,255,255,.8); font-size: clamp(1rem,1.25vw,1.15rem); line-height: 1.55; }
.hero .primary-action { border-color: var(--agua); color: var(--brand-deep); background: var(--agua); }
.hero .primary-action:hover { border-color: #fff; background: #fff; }

.atlas { min-width: 0; margin: 0; }
.a-plate { width: 100%; aspect-ratio: 1200/760; position: relative; overflow: hidden; border: 1px solid rgba(255,255,255,.38); background: #dfeae6; }
.a-svg { width: 100%; height: 100%; display: block; }
.a-meta { position: absolute; z-index: 2; padding: 5px 7px; overflow-wrap: anywhere; color: var(--mata); background: rgba(245,242,236,.9); font-family: var(--font-label); font-size: .68rem; letter-spacing: .05em; line-height: 1.25; text-transform: uppercase; }
.a-label { top: 12px; right: 35%; left: 12px; }
.a-north { top: 12px; right: 12px; left: 65%; display: grid; justify-items: end; }
.a-north b { color: var(--agua); font-size: 1rem; line-height: 1; }
.a-scale { right: 12px; bottom: 12px; left: 50%; text-align: right; }
.a-grid-label { right: 50%; bottom: 12px; left: 12px; }
.a-features { display: none; }
.a-legend { margin: 9px 0 0; padding: 0; display: grid; grid-template-columns: repeat(5,1fr); border-block: 1px solid rgba(255,255,255,.24); list-style: none; }
.a-legend li { min-width: 0; padding: 7px 4px; display: flex; align-items: center; gap: 6px; overflow-wrap: anywhere; color: rgba(255,255,255,.78); font-family: var(--font-label); font-size: .68rem; text-transform: uppercase; }
.a-legend li span { width: 9px; height: 9px; flex: 0 0 auto; border: 1px solid currentColor; }
.a-route { fill: none; stroke: var(--mata); stroke-width: 6; stroke-dasharray: 14 12; }
.a-marker text { fill: #fff; font-family: var(--font-label); text-anchor: middle; }

.trace { margin-top: 12px; color: #fff; }
.t-label { display: block; margin-bottom: 7px; color: var(--agua); }
.trace ol { margin: 0; padding: 0; display: grid; grid-template-columns: repeat(4,1fr); list-style: none; }
.t-step { min-width: 0; padding: 5px 8px; display: grid; grid-template-columns: 24px minmax(0,1fr); gap: 0 5px; overflow-wrap: anywhere; border-left: 1px solid rgba(255,255,255,.17); }
.t-step:first-child { border-left: 0; }
.t-step > span { grid-row: 1/span 2; color: var(--agua); font-family: var(--font-label); font-size: .58rem; }
.t-step strong { font-size: .72rem; }
.t-step small { color: rgba(255,255,255,.66); font-size: .59rem; line-height: 1.2; }

@keyframes atlas-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@keyframes route-in { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }

@media (prefers-reduced-motion: no-preference) {
  .atlas-reveal { opacity: 0; animation: atlas-in .8s ease-out forwards; }
  .a-route { stroke-dasharray: 1; stroke-dashoffset: 1; animation: route-in .8s ease-out forwards; }
}

@media (min-width: 1100px) {
  .h-layout { grid-template-columns: minmax(0,.38fr) minmax(0,.62fr); gap: clamp(28px,3vw,52px); }
}

@media (max-width: 1099px) {
  .h-layout { min-height: auto; align-items: start; }
  .h-copy { max-width: 690px; }
}

@media (max-width: 720px) {
  .h-layout { padding-block: 32px 48px; gap: 28px; }
  .hero h1 { margin: 14px 0 16px; font-size: clamp(2.35rem,12vw,3.4rem); }
  .h-summary { margin-bottom: 18px; font-size: .95rem; line-height: 1.45; }
  .a-svg text { display: none; }
  .a-features { margin: 9px 0 0; display: block; color: rgba(255,255,255,.78); font-family: var(--font-label); font-size: .72rem; line-height: 1.5; }
  .a-legend { grid-template-columns: repeat(2,1fr); }
  .trace ol { grid-template-columns: repeat(2,1fr); }
  .t-step:nth-child(3) { border-left: 0; }
  .t-step small { display: none; }
}

@media (max-width: 480px) {
  .a-plate { min-height: 280px; }
}

@media (prefers-reduced-motion: reduce) {
  .atlas-reveal { opacity: 1; transform: none; }
  .a-route { stroke-dasharray: 14 12; stroke-dashoffset: 0; }
}
```

Do not retain old absolute `.territory-map__canvas`, overlay `.territory-hero::after`, `object-fit: cover`, or `translateY(-160px)` rules.

- [ ] **Step 9: Replace obsolete browser geometry and motion selectors**

In `apps/site/e2e/site.spec.ts`:

- replace the visible label with `Atlas demonstrativo — sem dados operacionais`;
- replace the old `.territory-map__layer--base` and `.territory-map__layer--details` assertions with `.map-base` and `.map-details`, expecting `atlas-in`;
- replace old marker and route selectors with `.a-marker` and `.a-route`;
- delete the old tests named `keeps all route markers clear of visible copy and trace` and `keeps mid-width hero copy and trace in separate regions`;
- delete the now-unused file-level `Rectangle` type and `rectanglesIntersect` helper with those tests;
- retain the new short-desktop test from Step 6. Task 5 adds the full cross-width geometry contract.

- [ ] **Step 10: Run GREEN gates for atlas and hero**

Run:

```bash
npm run check
npm run e2e -- --project=desktop-short --grep "fully frames the atlas"
npm run build
npm run budget
```

Expected:

- lint/typecheck/unit tests pass;
- short-desktop atlas contract passes;
- JavaScript remains `≤225000`;
- CSS remains `≤16000`, with a preferred measured total `≤15600` after old-rule removal.

- [ ] **Step 11: Commit the atlas replacement**

```bash
git add apps/site/src/components/TerritoryAtlas.tsx \
  apps/site/src/components/TerritoryAtlas.test.tsx \
  apps/site/src/components/TerritoryHero.tsx \
  apps/site/src/components/TerritoryHero.test.tsx \
  apps/site/src/components/TerritoryStoryMap.tsx \
  apps/site/src/components/TerritoryStoryMap.test.tsx \
  apps/site/src/Site.test.tsx \
  apps/site/src/styles.css \
  apps/site/playwright.config.ts \
  apps/site/e2e/site.spec.ts
git commit -m "feat(site): replace cropped map with territory atlas"
```

---

### Task 3: Add the Source-Backed Local Climate Context Ledger

**Files:**

- Create: `apps/site/src/components/EnvironmentalContext.test.tsx`
- Create: `apps/site/src/components/EnvironmentalContext.tsx`
- Modify: `apps/site/src/Site.tsx`
- Modify: `apps/site/src/Site.test.tsx`
- Modify: `apps/site/src/styles.css`

**Interfaces:**

- Consumes: Task 1 `environmentalIndicators`, `ENVIRONMENTAL_INDICATORS_UPDATED_LABEL`, and `ENVIRONMENTAL_CONTEXT_BOUNDARY`.
- Produces: default component `EnvironmentalContext(): JSX.Element` with section id `contexto-climatico`.
- Produces: five explicit source links, one for displacement, two for drought, one for shade, and one for water disasters.
- Preserves: no props, no `fetch`, no app URL, and no contact behavior.

- [ ] **Step 1: Write the failing climate context component tests**

Create `apps/site/src/components/EnvironmentalContext.test.tsx`:

```tsx
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ENVIRONMENTAL_CONTEXT_BOUNDARY,
  environmentalIndicators
} from '../data/environmentalIndicators';
import EnvironmentalContext from './EnvironmentalContext';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('EnvironmentalContext', () => {
  it('presents public context with an explicit honesty boundary', () => {
    render(<EnvironmentalContext />);

    const section = screen.getByRole('region', {
      name: 'Quando o território muda, quem vive nele sente primeiro.'
    });
    expect(within(section).getByText(/Contexto climático do território/)).toBeInTheDocument();
    expect(
      within(section).getByRole('heading', {
        level: 2,
        name: 'Quando o território muda, quem vive nele sente primeiro.'
      })
    ).toBeInTheDocument();
    expect(within(section).getByRole('note')).toHaveTextContent(
      ENVIRONMENTAL_CONTEXT_BOUNDARY
    );
    expect(section).toHaveTextContent(
      'Dados públicos ajudam a dimensionar a pressão. O Angico organiza o que cada comunidade percebe, prioriza, faz e comprova no lugar.'
    );
    expect(section).toHaveTextContent('Atualizado em julho de 2026');
    expect(section).not.toHaveTextContent(/impacto do Angico|resultado gerado pelo Angico/i);
  });

  it('renders four indicators in canonical order with complete context', () => {
    render(<EnvironmentalContext />);

    const ledger = screen.getByRole('list', { name: 'Indicadores climáticos públicos' });
    const items = within(ledger).getAllByRole('listitem');
    expect(items).toHaveLength(4);

    environmentalIndicators.forEach((indicator, index) => {
      const scope = within(items[index]);
      expect(scope.getByRole('heading', { level: 3, name: indicator.title })).toBeInTheDocument();
      expect(scope.getByText(indicator.code)).toBeInTheDocument();
      expect(scope.getByText(indicator.value)).toBeInTheDocument();
      expect(scope.getByText(indicator.unit)).toBeInTheDocument();
      expect(scope.getByText(indicator.geography)).toBeInTheDocument();
      expect(scope.getByText(indicator.period)).toBeInTheDocument();
      expect(scope.getByText(indicator.statement)).toBeInTheDocument();
      expect(scope.getByText(indicator.caveat)).toBeInTheDocument();
      expect(scope.getByText('No território')).toBeInTheDocument();
      expect(scope.getByText(indicator.localSignal)).toBeInTheDocument();
    });
  });

  it('gives every source a contextual name and safe external-link attributes', () => {
    render(<EnvironmentalContext />);

    for (const indicator of environmentalIndicators) {
      for (const source of indicator.sources) {
        const link = screen.getByRole('link', {
          name: `Fonte: ${source.label} — ${indicator.title}`
        });
        expect(link).toHaveAttribute('href', source.url);
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noreferrer');
      }
    }
    expect(screen.getAllByRole('link', { name: /^Fonte:/ })).toHaveLength(5);
  });

  it('renders entirely from the local snapshot without fetching sources', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<EnvironmentalContext />);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the focused component test and verify RED**

Run from `apps/site`:

```bash
npm test -- --run src/components/EnvironmentalContext.test.tsx
```

Expected: exit `1` because `./EnvironmentalContext` does not exist.

- [ ] **Step 3: Implement the semantic editorial ledger**

Create `apps/site/src/components/EnvironmentalContext.tsx`:

```tsx
import {
  ENVIRONMENTAL_CONTEXT_BOUNDARY,
  ENVIRONMENTAL_INDICATORS_UPDATED_LABEL,
  environmentalIndicators
} from '../data/environmentalIndicators';

export default function EnvironmentalContext() {
  return (
    <section
      id="contexto-climatico"
      className="climate"
      aria-labelledby="climate-title"
    >
      <div className="site-frame c-inner">
        <header className="c-heading">
          <p className="section-label">— Contexto climático do território</p>
          <h2 id="climate-title">
            Quando o território muda, quem vive nele sente primeiro.
          </h2>
          <p>
            Dados públicos ajudam a dimensionar a pressão. O Angico organiza o que cada
            comunidade percebe, prioriza, faz e comprova no lugar.
          </p>
        </header>

        <p className="c-boundary" role="note">
          {ENVIRONMENTAL_CONTEXT_BOUNDARY}
        </p>

        <ol
          className="c-ledger"
          aria-label="Indicadores climáticos públicos"
        >
          {environmentalIndicators.map((indicator, index) => (
            <li
              className={
                index === 0
                  ? 'c-entry c-entry--lead'
                  : 'c-entry'
              }
              key={indicator.id}
            >
              <p className="c-code">{indicator.code}</p>
              <h3>{indicator.title}</h3>
              <p className="c-measure">
                <strong>{indicator.value}</strong>
                <span>{indicator.unit}</span>
              </p>
              <p className="c-statement">{indicator.statement}</p>
              <dl className="c-meta">
                <div>
                  <dt>Território</dt>
                  <dd>{indicator.geography}</dd>
                </div>
                <div>
                  <dt>Período</dt>
                  <dd>{indicator.period}</dd>
                </div>
              </dl>
              <p className="c-local">
                <b>No território</b>
                <span>{indicator.localSignal}</span>
              </p>
              <p className="c-caveat">{indicator.caveat}</p>
              <div className="c-sources">
                {indicator.sources.map((source) => (
                  <a
                    aria-label={`Fonte: ${source.label} — ${indicator.title}`}
                    href={source.url}
                    key={source.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {source.label}
                  </a>
                ))}
              </div>
            </li>
          ))}
        </ol>

        <p className="c-updated">
          {ENVIRONMENTAL_INDICATORS_UPDATED_LABEL}
        </p>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Integrate the section immediately after the hero and test order**

Update `apps/site/src/Site.tsx` imports:

```tsx
import AnimatedLeafFooter from './components/AnimatedLeafFooter';
import ContactSection from './components/ContactSection';
import EnvironmentalContext from './components/EnvironmentalContext';
import TerritoryHero from './components/TerritoryHero';
import WhyAngico from './components/WhyAngico';
```

Use this exact `main` composition:

```tsx
<main id="conteudo">
  <TerritoryHero />
  <EnvironmentalContext />
  <WhyAngico />
  <ContactSection contactApiUrl={contactApiUrl} />
</main>
```

Add this test to `apps/site/src/Site.test.tsx`:

```tsx
it('places public climate context after the demonstrative atlas and before product explanation', () => {
  render(<Site {...urls} />);

  const hero = document.querySelector('#inicio');
  const context = document.querySelector('#contexto-climatico');
  const why = document.querySelector('#unico');
  expect(hero).not.toBeNull();
  expect(context).not.toBeNull();
  expect(why).not.toBeNull();
  if (!hero || !context || !why) throw new Error('Expected hero, climate context and product explanation.');
  expect(hero.compareDocumentPosition(context) & Node.DOCUMENT_POSITION_FOLLOWING)
    .toBeTruthy();
  expect(context.compareDocumentPosition(why) & Node.DOCUMENT_POSITION_FOLLOWING)
    .toBeTruthy();
  expect(screen.getByText(/não representam resultados produzidos pelo Angico/i))
    .toBeInTheDocument();
});
```

- [ ] **Step 5: Run component and integration tests and verify GREEN before styling**

Run:

```bash
npm test -- --run \
  src/data/environmentalIndicators.test.ts \
  src/components/EnvironmentalContext.test.tsx \
  src/Site.test.tsx
```

Expected: all focused tests pass, with five source links and zero calls to `fetch`.

- [ ] **Step 6: Add the ledger styles as one coherent block**

First add `.climate h2` to the existing shared `h2` margin selector and add `.c-heading > p:last-child` to the existing shared long-introduction selector. Then insert this compact block after the atlas/Rastro styles and before `.why-angico` in `apps/site/src/styles.css`:

```css
.climate { --c-line: color-mix(in srgb,var(--mata) 24%,transparent); padding-block: clamp(76px,9vw,126px); background: color-mix(in srgb,var(--fibra) 82%,#dfeae6); }
.c-heading { max-width: 930px; }
.c-boundary { margin: 28px 0 0; padding: 12px 0 12px 16px; border-left: 3px solid var(--agua); color: var(--mata); font-weight: 600; }
.c-ledger { margin: clamp(44px,6vw,72px) 0 0; padding: 0; display: grid; list-style: none; border-block: 1px solid var(--c-line); }
.c-entry { min-width: 0; padding: 24px 0; }
.c-entry + .c-entry { border-top: 1px solid var(--c-line); }
.c-code, .c-updated, .climate dt, .c-local b { color: var(--mata); font-family: var(--font-label); font-size: .68rem; letter-spacing: .06em; text-transform: uppercase; }
.c-entry h3 { margin: 10px 0 18px; }
.c-measure { margin: 0; display: grid; }
.c-measure strong { color: var(--mata); font-family: var(--font-display); font-size: clamp(3rem,6vw,5.8rem); line-height: .9; letter-spacing: -.05em; }
.c-measure span { margin-top: 7px; color: var(--mata); font-weight: 700; }
.c-statement { margin: 18px 0 0; line-height: 1.55; }
.c-meta { margin: 18px 0 0; display: flex; flex-wrap: wrap; gap: 12px 24px; }
.c-meta dd { margin: 0; }
.c-local { margin: 20px 0 0; display: grid; gap: 6px; }
.c-caveat { margin: 16px 0 0; color: #59666a; font-size: .78rem; line-height: 1.45; }
.c-sources { margin-top: 15px; display: grid; gap: 7px; }
.c-sources a { padding-block: 5px; color: var(--mata); font-family: var(--font-label); font-size: .75rem; text-underline-offset: 4px; }
.c-updated { margin: 18px 0 0; text-align: right; }

@media (min-width: 960px) {
  .c-ledger { grid-template-columns: minmax(0,1.08fr) minmax(330px,.92fr); grid-template-rows: repeat(3,auto); }
  .c-entry { padding: 22px 0 22px 32px; border-left: 1px solid var(--c-line); }
  .c-entry--lead { grid-row: 1/4; padding: 34px 46px 34px 0; border: 0; }
  .c-entry--lead .c-measure strong { font-size: clamp(5.5rem,9vw,8.5rem); }
}
```

Do not add border-radius, floating cards, shadows, or a dashboard-style control bar.

- [ ] **Step 7: Run GREEN checks and bundle limits**

Run:

```bash
npm run check
npm run build
npm run budget
```

Expected:

- all unit tests pass;
- JavaScript remains `≤225000`;
- CSS remains `≤16000`.

- [ ] **Step 8: Commit the climate context section**

```bash
git add apps/site/src/components/EnvironmentalContext.tsx \
  apps/site/src/components/EnvironmentalContext.test.tsx \
  apps/site/src/Site.tsx \
  apps/site/src/Site.test.tsx \
  apps/site/src/styles.css
git commit -m "feat(site): connect public climate context to territory"
```

---

### Task 4: Turn the Footer into a Continuous Twelve-Leaf Field

**Files:**

- Modify: `apps/site/src/components/AnimatedLeafFooter.test.tsx`
- Modify: `apps/site/src/components/AnimatedLeafFooter.tsx`
- Modify: `apps/site/src/styles.css`
- Modify: `apps/site/e2e/site.spec.ts`

**Interfaces:**

- Produces: twelve `.leaf` spans with `data-trajectory="left|center|right"`.
- Produces CSS variables: `--leaf-x`, `--leaf-size`, `--leaf-duration`, `--leaf-delay`, `--leaf-opacity`, and `--leaf-rest`.
- Preserves: footer wordmark, copy, return link, pointer transparency, and official `/angico-leaf-ink.png` mask.

- [ ] **Step 1: Replace the single-leaf test with the failing twelve-leaf contract**

Replace `apps/site/src/components/AnimatedLeafFooter.test.tsx` with:

```tsx
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import AnimatedLeafFooter from './AnimatedLeafFooter';

afterEach(cleanup);

describe('AnimatedLeafFooter', () => {
  it('keeps essential content and renders twelve deterministic official leaves', () => {
    const { container } = render(<AnimatedLeafFooter />);

    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Angico, voltar ao início' })).toHaveAttribute(
      'href',
      '#inicio'
    );
    expect(screen.getByRole('link', { name: 'Voltar ao início' })).toHaveAttribute(
      'href',
      '#conteudo'
    );
    expect(
      screen.getByRole('link', { name: 'Angico, voltar ao início' }).querySelector('img')
    ).toHaveAttribute('src', '/angico-logo-white.png');

    const stage = container.querySelector('.leaf-stage');
    const leaves = Array.from(container.querySelectorAll<HTMLElement>('.leaf'));
    expect(stage).toHaveAttribute('aria-hidden', 'true');
    expect(leaves).toHaveLength(12);
    expect(new Set(leaves.map((leaf) => leaf.dataset.trajectory))).toEqual(
      new Set(['left', 'center', 'right'])
    );
    for (const leaf of leaves) {
      expect(leaf.style.getPropertyValue('--leaf-x')).not.toBe('');
      expect(leaf.style.getPropertyValue('--leaf-size')).not.toBe('');
      expect(leaf.style.getPropertyValue('--leaf-duration')).not.toBe('');
      expect(leaf.style.getPropertyValue('--leaf-delay')).toMatch(/^-/);
      expect(leaf.style.getPropertyValue('--leaf-opacity')).not.toBe('');
      expect(leaf.style.getPropertyValue('--leaf-rest')).not.toBe('');
      expect(leaf.style.getPropertyValue('--leaf-start-x')).not.toBe('');
      expect(leaf.style.getPropertyValue('--leaf-end-r')).not.toBe('');
    }
    const sizes = leaves.map((leaf) => Number.parseFloat(leaf.style.getPropertyValue('--leaf-size')));
    const opacities = leaves.map((leaf) => Number.parseFloat(leaf.style.getPropertyValue('--leaf-opacity')));
    const positions = leaves.map((leaf) => Number.parseFloat(leaf.style.getPropertyValue('--leaf-x')));
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(26);
    expect(Math.max(...sizes)).toBeLessThanOrEqual(72);
    expect(Math.min(...opacities)).toBeGreaterThanOrEqual(.18);
    expect(Math.max(...opacities)).toBeLessThanOrEqual(.62);
    expect(Math.max(...positions) - Math.min(...positions)).toBeGreaterThanOrEqual(60);
  });
});
```

Append these browser tests before implementation:

```ts
test('runs a continuous deterministic field of twelve leaves', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');

  const leaves = page.locator('.leaf');
  await expect(leaves).toHaveCount(12);

  const state = await leaves.evaluateAll((elements) =>
    elements.map((leaf) => {
      const styles = getComputedStyle(leaf);
      const rect = leaf.getBoundingClientRect();
      const footer = leaf.closest('footer')?.getBoundingClientRect();
      if (!footer) throw new Error('Expected leaf inside footer.');
      return {
        animationName: styles.animationName,
        duration: Number.parseFloat(styles.animationDuration) * 1000,
        delay: Number.parseFloat(styles.animationDelay) * 1000,
        opacity: Number.parseFloat(styles.opacity),
        display: styles.display,
        intersectsFooter:
          rect.right > footer.left && rect.left < footer.right &&
          rect.bottom > footer.top && rect.top < footer.bottom
      };
    })
  );

  expect(state.every(({ animationName }) => animationName === 'leaf-field-fall')).toBe(true);
  expect(state.every(({ duration }) => duration >= 7_800 && duration <= 12_400)).toBe(true);
  expect(state.every(({ delay }) => delay < 0)).toBe(true);
  expect(
    state.filter(
      ({ display, opacity, intersectsFooter }) =>
        display !== 'none' && opacity > 0 && intersectsFooter
    ).length
  )
    .toBeGreaterThanOrEqual(3);
});

test('moves every animated leaf below the footer before its first restart', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');

  const results = await page.locator('.leaf').evaluateAll(async (leaves) => {
    const result: Array<{ leafTop: number; footerBottom: number }> = [];
    for (const leaf of leaves) {
      const animation = leaf.getAnimations()[0];
      const effect = animation?.effect;
      if (!animation || !effect) throw new Error('Expected a leaf animation.');
      const timing = effect.getTiming();
      const duration = Number(timing.duration);
      const delay = Number(timing.delay);
      animation.pause();
      animation.currentTime = duration + delay - 1;
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const footer = leaf.closest('footer');
      if (!footer) throw new Error('Expected leaf inside footer.');
      result.push({
        leafTop: leaf.getBoundingClientRect().top,
        footerBottom: footer.getBoundingClientRect().bottom
      });
    }
    return result;
  });

  expect(results).toHaveLength(12);
  expect(results.every(({ leafTop, footerBottom }) => leafTop >= footerBottom)).toBe(true);
});

test('rests four leaves and hides eight when motion is reduced', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  const states = await page.locator('.leaf').evaluateAll((leaves) =>
    leaves.map((leaf) => {
      const styles = getComputedStyle(leaf);
      return { display: styles.display, animationName: styles.animationName };
    })
  );
  expect(states).toHaveLength(12);
  expect(states.filter(({ display }) => display !== 'none')).toHaveLength(4);
  expect(states.filter(({ display }) => display === 'none')).toHaveLength(8);
  expect(states.every(({ animationName }) => animationName === 'none')).toBe(true);
});
```

- [ ] **Step 2: Run unit and browser contracts and verify RED**

Run from `apps/site`:

```bash
npm test -- --run src/components/AnimatedLeafFooter.test.tsx
npm run e2e -- --project=desktop --grep "twelve leaves|below the footer|hides eight"
```

Expected: both commands exit `1`; the component exposes one leaf, not twelve, and lacks the new animation.

- [ ] **Step 3: Implement deterministic leaf descriptors**

Replace `apps/site/src/components/AnimatedLeafFooter.tsx` with:

```tsx
import type { CSSProperties } from 'react';

type LeafTrajectory = 'left' | 'center' | 'right';

interface LeafDescriptor {
  readonly id: string;
  readonly trajectory: LeafTrajectory;
  readonly x: string;
  readonly size: string;
  readonly duration: string;
  readonly delay: string;
  readonly opacity: string;
  readonly rest: string;
}

interface LeafStyle extends CSSProperties {
  '--leaf-x': string;
  '--leaf-size': string;
  '--leaf-duration': string;
  '--leaf-delay': string;
  '--leaf-opacity': string;
  '--leaf-rest': string;
  '--leaf-start-x': string;
  '--leaf-mid-x': string;
  '--leaf-end-x': string;
  '--leaf-start-r': string;
  '--leaf-mid-r': string;
  '--leaf-end-r': string;
}

const trajectoryStyles = {
  left: { '--leaf-start-x': '-28px', '--leaf-mid-x': '18px', '--leaf-end-x': '-7px', '--leaf-start-r': '-28deg', '--leaf-mid-r': '112deg', '--leaf-end-r': '252deg' },
  center: { '--leaf-start-x': '8px', '--leaf-mid-x': '-24px', '--leaf-end-x': '15px', '--leaf-start-r': '12deg', '--leaf-mid-r': '148deg', '--leaf-end-r': '286deg' },
  right: { '--leaf-start-x': '26px', '--leaf-mid-x': '-16px', '--leaf-end-x': '31px', '--leaf-start-r': '30deg', '--leaf-mid-r': '176deg', '--leaf-end-r': '320deg' }
} as const satisfies Record<LeafTrajectory, Pick<LeafStyle,
  '--leaf-start-x' | '--leaf-mid-x' | '--leaf-end-x' |
  '--leaf-start-r' | '--leaf-mid-r' | '--leaf-end-r'
>>;

const leaves = [
  { id: '01', trajectory: 'left', x: '12%', size: '32px', duration: '8.6s', delay: '-1.2s', opacity: '.42', rest: '24px' },
  { id: '02', trajectory: 'center', x: '31%', size: '48px', duration: '10.2s', delay: '-7.4s', opacity: '.36', rest: '36px' },
  { id: '03', trajectory: 'right', x: '58%', size: '28px', duration: '7.8s', delay: '-3.9s', opacity: '.54', rest: '20px' },
  { id: '04', trajectory: 'center', x: '78%', size: '36px', duration: '12.4s', delay: '-10.8s', opacity: '.28', rest: '30px' },
  { id: '05', trajectory: 'right', x: '17%', size: '40px', duration: '9.4s', delay: '-6.1s', opacity: '.34', rest: '18px' },
  { id: '06', trajectory: 'left', x: '43%', size: '26px', duration: '8.1s', delay: '-5.3s', opacity: '.58', rest: '42px' },
  { id: '07', trajectory: 'center', x: '65%', size: '54px', duration: '11.6s', delay: '-2.7s', opacity: '.31', rest: '26px' },
  { id: '08', trajectory: 'left', x: '82%', size: '28px', duration: '9.9s', delay: '-8.8s', opacity: '.46', rest: '44px' },
  { id: '09', trajectory: 'right', x: '14%', size: '72px', duration: '12.1s', delay: '-4.6s', opacity: '.18', rest: '16px' },
  { id: '10', trajectory: 'center', x: '37%', size: '30px', duration: '8.9s', delay: '-7.9s', opacity: '.62', rest: '32px' },
  { id: '11', trajectory: 'left', x: '62%', size: '44px', duration: '10.8s', delay: '-9.7s', opacity: '.39', rest: '22px' },
  { id: '12', trajectory: 'right', x: '76%', size: '34px', duration: '9.1s', delay: '-2.1s', opacity: '.49', rest: '40px' }
] as const satisfies readonly LeafDescriptor[];

export default function AnimatedLeafFooter() {
  return (
    <footer className="site-footer">
      <div className="leaf-stage" aria-hidden="true">
        {leaves.map((leaf) => {
          const style: LeafStyle = {
            ...trajectoryStyles[leaf.trajectory],
            '--leaf-x': leaf.x,
            '--leaf-size': leaf.size,
            '--leaf-duration': leaf.duration,
            '--leaf-delay': leaf.delay,
            '--leaf-opacity': leaf.opacity,
            '--leaf-rest': leaf.rest
          };
          return (
            <span
              className="leaf"
              data-trajectory={leaf.trajectory}
              key={leaf.id}
              style={style}
            />
          );
        })}
      </div>

      <div className="site-frame footer-inner">
        <a className="footer-wordmark" href="#inicio" aria-label="Angico, voltar ao início">
          <img src="/angico-logo-white.png" alt="" />
        </a>
        <p>Memória coletiva para ações que precisam continuar.</p>
        <a href="#conteudo">Voltar ao início</a>
      </div>
    </footer>
  );
}
```

- [ ] **Step 4: Replace the single-leaf CSS with one variable-driven field**

Replace the current footer layout, old `.footer-leaf-stage`, old `.footer-leaf`, and `leaf-fall` rules with the shorter `.leaf-stage`/`.leaf` hooks below:

```css
.site-footer { min-height: 340px; position: relative; overflow: hidden; color: var(--fibra); background: var(--brand-deep); }
.site-footer a:focus-visible { outline-color: var(--fibra); }
.leaf-stage { position: absolute; z-index: 1; inset: 0; overflow: hidden; pointer-events: none; }
.leaf { width: var(--leaf-size); aspect-ratio: 1; position: absolute; top: -90px; left: var(--leaf-x); opacity: 0; background: var(--agua); -webkit-mask: url('/angico-leaf-ink.png') center/contain no-repeat; mask: url('/angico-leaf-ink.png') center/contain no-repeat; }
.footer-inner { min-height: 340px; position: relative; z-index: 2; padding-block: 70px 46px; display: grid; grid-template-columns: 1fr auto auto; align-items: end; gap: 34px; font-size: .9rem; }
.footer-wordmark { width: 126px; min-height: 44px; display: inline-flex; align-items: center; }
.footer-wordmark img { width: 126px; display: block; }
.footer-inner p { margin: 0; }
.footer-inner > a:last-child { min-height: 44px; align-content: center; font-weight: 600; text-underline-offset: 5px; }

@keyframes leaf-field-fall {
  0% { opacity: 0; transform: translate3d(var(--leaf-start-x),0,0) rotate(var(--leaf-start-r)); }
  10% { opacity: var(--leaf-opacity); }
  48% { transform: translate3d(var(--leaf-mid-x),265px,0) rotate(var(--leaf-mid-r)); }
  88% { opacity: var(--leaf-opacity); }
  100% { opacity: 0; transform: translate3d(var(--leaf-end-x),560px,0) rotate(var(--leaf-end-r)); }
}

@media (prefers-reduced-motion: no-preference) {
  .leaf { animation: leaf-field-fall var(--leaf-duration) linear var(--leaf-delay) infinite; }
}

@media (max-width: 720px) {
  .site-footer, .footer-inner { min-height: 360px; }
  .footer-inner { padding-block: 52px 36px; grid-template-columns: 1fr; gap: 10px; align-content: end; }
}

@media (prefers-reduced-motion: reduce) {
  .leaf { top: auto; bottom: var(--leaf-rest); display: block; opacity: var(--leaf-opacity); transform: rotate(var(--leaf-start-r)); animation: none; }
  .leaf:nth-child(n+5) { display: none; }
}
```

Remove the old no-preference and reduced-motion `.footer-leaf` declarations so they cannot override this contract.

- [ ] **Step 5: Run footer GREEN tests and motion probes**

Run:

```bash
npm test -- --run src/components/AnimatedLeafFooter.test.tsx
npm run e2e -- --project=desktop --grep "twelve leaves|below the footer|hides eight"
npm run build
npm run budget
```

Expected:

- unit footer test passes;
- all three focused browser tests pass;
- exactly twelve leaves exist;
- CSS and JavaScript remain within unchanged limits.

- [ ] **Step 6: Commit the deterministic leaf field**

```bash
git add apps/site/src/components/AnimatedLeafFooter.tsx \
  apps/site/src/components/AnimatedLeafFooter.test.tsx \
  apps/site/src/styles.css \
  apps/site/e2e/site.spec.ts
git commit -m "feat(site): animate a continuous Angico leaf field"
```

---

### Task 5: Lock Responsive, Accessible, Honest End-to-End Behavior

**Files:**

- Modify: `apps/site/e2e/site.spec.ts`
- Modify only if a new RED assertion proves a defect: `apps/site/src/styles.css`

**Interfaces:**

- Consumes all Tasks 1–4.
- Produces ten-viewport contracts, five-source keyboard order, dense 320–1538 geometry sweep, network silence, Axe evidence, and final motion assertions.
- Does not authorize copy changes, new features, budget increases, or layout improvisation outside the approved spec.

- [ ] **Step 1: Run the pre-update browser suite and record the expected RED contracts**

Run from `apps/site`:

```bash
npm run e2e -- \
  --project=mobile-320 \
  --project=desktop \
  --project=desktop-short
```

Expected: exit `1` in the stale keyboard/motion assertions because source links now sit between the CTA and contact fields, and the footer no longer uses one `9s` `leaf-fall` animation. Confirm no failure comes from build, missing modules, or source fetches.

- [ ] **Step 2: Replace the primary journey test with the complete source-aware contract**

Confirm the obsolete file-level `Rectangle` type and `rectanglesIntersect` helper were removed in Task 2. Replace the test named `keeps the public journey responsive, keyboard-accessible and quiet` with:

```ts
test('keeps the public journey responsive, sourced, keyboard-accessible and quiet', async ({ page }) => {
  const errors: string[] = [];
  const unexpectedRequestUrls: string[] = [];
  const allowedRequestOrigins = new Set(['http://127.0.0.1:4175']);
  const sources = [
    {
      name: 'Fonte: IDMC — Global Report on Internal Displacement 2025 — Exílio climático',
      href: 'https://www.internal-displacement.org/spotlights/brazil-floods-in-rio-grande-do-sul-trigger-record-displacement/'
    },
    {
      name: 'Fonte: Cemaden/MCTI — extensão da seca em 2023–2024 — El Niño e seca',
      href: 'https://www.gov.br/cemaden/pt-br/assuntos/noticias-cemaden/entre-2023-e-2024-cerca-de-60-do-territorio-brasileiro-foi-afetado-seca-extensa-e-intensa-aponta-nota-tecnica-do-cemaden'
    },
    {
      name: 'Fonte: Cemaden/MCTI — diagnóstico das secas e condicionantes climáticos — El Niño e seca',
      href: 'https://www.gov.br/cemaden/pt-br/assuntos/noticias-cemaden/cemaden-analisa-secas-recentes-no-brasil-e-apresenta-diagnostico-e-projecoes-como-subsidio-para-a-cop-16'
    },
    {
      name: 'Fonte: IBGE — Características Urbanísticas do Entorno dos Domicílios — Calor sem sombra',
      href: 'https://educa.ibge.gov.br/criancas/voce-sabia/22715-entorno-dos-domicilios.html'
    },
    {
      name: 'Fonte: Cemaden/MCTI — desastres relacionados à água no Brasil — O risco já é local',
      href: 'https://www.gov.br/cemaden/pt-br/assuntos/noticias-cemaden/desastres-relacionados-a-agua-no-brasil-aumentam-nas-ultimas-tres-decadas-e-ja-afetaram-quase-130-milhoes-de-pessoas'
    }
  ];

  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    const requestUrl = new URL(request.url());
    if (['http:', 'https:'].includes(requestUrl.protocol) && !allowedRequestOrigins.has(requestUrl.origin)) {
      unexpectedRequestUrls.push(request.url());
    }
  });
  await page.route('**/api/contact', async (route) => {
    expect(route.request().method()).toBe('POST');
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"accepted":true}' });
  });

  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'O trabalho continua. A memória também.'
  );
  await expect(page.getByRole('heading', { level: 2, name: /Quando o território muda/ }))
    .toBeVisible();
  await expect(page.getByRole('link', { name: 'Já sou membro' })).toHaveAttribute(
    'href',
    'http://127.0.0.1:4176/login'
  );
  await expect(
    page.getByRole('link', { name: 'Quero levar o Angico ao meu território' })
  ).toHaveAttribute('href', '#contato');
  await expect(page.getByText('Atlas demonstrativo — sem dados operacionais')).toBeVisible();
  await expect(page.getByRole('note')).toContainText(
    'não representam resultados produzidos pelo Angico'
  );

  for (const { name, href } of sources) {
    const source = page.getByRole('link', { name });
    await expect(source).toHaveAttribute('href', href);
    await expect(source).toHaveAttribute('target', '_blank');
    await expect(source).toHaveAttribute('rel', 'noreferrer');
  }

  const overflowingElements = await page.locator('body *').evaluateAll((elements) =>
    elements.flatMap((element) => {
      const rect = element.getBoundingClientRect();
      if (rect.left >= -0.5 && rect.right <= window.innerWidth + 0.5) return [];
      return [`${element.tagName.toLowerCase()}.${element.className}: ${rect.left}/${rect.right}`];
    })
  );
  expect(overflowingElements).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => window.innerWidth)
  );

  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  await expect(page.locator('.map-base')).toHaveCSS('animation-name', 'none');
  const reducedLeaves = await page.locator('.leaf').evaluateAll((leaves) =>
    leaves.map((leaf) => {
      const styles = getComputedStyle(leaf);
      return { display: styles.display, animationName: styles.animationName };
    })
  );
  expect(reducedLeaves.filter(({ display }) => display !== 'none')).toHaveLength(4);
  expect(reducedLeaves.filter(({ display }) => display === 'none')).toHaveLength(8);
  expect(reducedLeaves.every(({ animationName }) => animationName === 'none')).toBe(true);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');

  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Ir para o conteúdo' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#conteudo$/);

  await page.goto('/');
  const keyboardOrder = [
    page.getByRole('link', { name: 'Ir para o conteúdo' }),
    page.getByRole('link', { name: 'Angico, início' }),
    page.getByRole('link', { name: 'Por que é único' }),
    page.getByRole('link', { name: 'Como funciona' }),
    page.getByRole('link', { name: 'Já sou membro' }),
    page.getByRole('link', { name: 'Quero levar o Angico ao meu território' }),
    ...sources.map(({ name }) => page.getByRole('link', { name })),
    page.getByLabel('Nome')
  ];
  for (const target of keyboardOrder) {
    await page.keyboard.press('Tab');
    await expect(target).toBeFocused();
  }

  await page.keyboard.type('Ana Ribeiro');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('E-mail')).toBeFocused();
  await page.keyboard.type('ana@example.org');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Mensagem')).toBeFocused();
  await page.keyboard.type('Quero organizar a memória do território.');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Enviar mensagem' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toHaveText('Mensagem enviada.');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Angico, voltar ao início' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Voltar ao início', exact: true })).toBeFocused();

  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(accessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical'))
    .toEqual([]);
  expect(unexpectedRequestUrls).toEqual([]);
  expect(errors).toEqual([]);
});
```

- [ ] **Step 3: Replace the old one-leaf motion test with the atlas-only sequence check**

Replace the test named `plays the map once and loops only the leaf when motion is allowed` with:

```ts
test('plays the atlas once while all footer leaves loop independently', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');

  await expect(page.locator('.map-base')).toHaveCSS(
    'animation-name',
    'atlas-in'
  );
  await expect(page.locator('.map-base')).toHaveCSS(
    'animation-iteration-count',
    '1'
  );
  await expect(page.locator('.map-details')).toHaveCSS(
    'animation-delay',
    '0.8s'
  );
  await expect(page.locator('.a-signals')).toHaveCSS(
    'animation-delay',
    '1.35s'
  );
  await expect(page.locator('.a-marker--observation')).toHaveCSS(
    'animation-delay',
    '1.8s'
  );
  await expect(page.locator('.a-marker--action')).toHaveCSS(
    'animation-delay',
    '2.6s'
  );
  await expect(page.locator('.a-marker--evidence')).toHaveCSS(
    'animation-delay',
    '3.4s'
  );
  await expect(page.locator('.a-marker--result')).toHaveCSS(
    'animation-delay',
    '4.2s'
  );
  await expect(page.locator('.a-route--one')).toHaveCSS(
    'animation-name',
    'route-in'
  );

  const leafMotion = await page.locator('.leaf').evaluateAll((leaves) =>
    leaves.map((leaf) => {
      const styles = getComputedStyle(leaf);
      return {
        animationName: styles.animationName,
        iterationCount: styles.animationIterationCount
      };
    })
  );
  expect(leafMotion).toHaveLength(12);
  expect(
    leafMotion.every(
      ({ animationName, iterationCount }) =>
        animationName === 'leaf-field-fall' && iterationCount === 'infinite'
    )
  ).toBe(true);
});
```

Delete the original single-leaf test named `keeps the animated leaf below the footer before restarting`; Task 4's twelve-leaf exit probe supersedes it.

- [ ] **Step 4: Add the all-project atlas geometry contract**

Append this test:

```ts
test('keeps copy, atlas, legend and Rastro in their ordered regions', async ({ page }, testInfo) => {
  await page.goto('/');

  const geometry = await page.locator('.hero').evaluate((hero) => {
    const rect = (selector: string) => {
      const element = hero.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      const { top, right, bottom, left } = element.getBoundingClientRect();
      return { top, right, bottom, left };
    };
    return {
      copy: rect('.h-copy'),
      atlas: rect('.atlas'),
      plate: rect('.a-plate'),
      svg: rect('.a-svg'),
      legend: rect('.a-legend'),
      trace: rect('.trace'),
      label: rect('.a-label'),
      north: rect('.a-north'),
      gridLabel: rect('.a-grid-label'),
      scale: rect('.a-scale'),
      cta: rect('.primary-action'),
      essentials: Array.from(
        hero.querySelectorAll<SVGGraphicsElement>(
          '.a-svg [data-layer], .a-marker, .a-route'
        )
      ).map((element) => {
        const { top, right, bottom, left, width, height } = element.getBoundingClientRect();
        return { top, right, bottom, left, width, height, label: element.getAttribute('data-layer') ?? element.getAttribute('class') ?? 'grid-axis' };
      }),
      viewport: { width: window.innerWidth, height: window.innerHeight }
    };
  });

  if (geometry.viewport.width >= 1100) {
    expect(geometry.copy.right).toBeLessThanOrEqual(geometry.atlas.left);
  } else {
    expect(geometry.copy.bottom).toBeLessThanOrEqual(geometry.atlas.top);
  }
  expect(geometry.svg.left).toBeGreaterThanOrEqual(geometry.plate.left);
  expect(geometry.svg.right).toBeLessThanOrEqual(geometry.plate.right);
  expect(geometry.svg.top).toBeGreaterThanOrEqual(geometry.plate.top);
  expect(geometry.svg.bottom).toBeLessThanOrEqual(geometry.plate.bottom);
  expect(geometry.plate.bottom).toBeLessThanOrEqual(geometry.legend.top);
  expect(geometry.legend.bottom).toBeLessThanOrEqual(geometry.trace.top);
  expect(geometry.legend.left).toBeGreaterThanOrEqual(geometry.atlas.left);
  expect(geometry.legend.right).toBeLessThanOrEqual(geometry.atlas.right);
  expect(geometry.trace.left).toBeGreaterThanOrEqual(geometry.atlas.left);
  expect(geometry.trace.right).toBeLessThanOrEqual(geometry.atlas.right);
  const intersects = (first: typeof geometry.label, second: typeof geometry.label) =>
    first.left < second.right && first.right > second.left &&
    first.top < second.bottom && first.bottom > second.top;
  expect(intersects(geometry.label, geometry.north)).toBe(false);
  expect(intersects(geometry.gridLabel, geometry.scale)).toBe(false);
  for (const essential of geometry.essentials) {
    expect(essential.width, `${essential.label} width`).toBeGreaterThan(0);
    expect(essential.height, `${essential.label} height`).toBeGreaterThan(0);
    expect(essential.left, `${essential.label} left`).toBeGreaterThanOrEqual(geometry.plate.left - .5);
    expect(essential.right, `${essential.label} right`).toBeLessThanOrEqual(geometry.plate.right + .5);
    expect(essential.top, `${essential.label} top`).toBeGreaterThanOrEqual(geometry.plate.top - .5);
    expect(essential.bottom, `${essential.label} bottom`).toBeLessThanOrEqual(geometry.plate.bottom + .5);
  }

  if (testInfo.project.name === 'desktop-short') {
    expect(geometry.cta.bottom).toBeLessThanOrEqual(geometry.viewport.height);
    expect(geometry.trace.bottom).toBeLessThanOrEqual(geometry.viewport.height);
  }
});

test('keeps mobile atlas marginalia legible at 200 percent text zoom', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-320');
  await page.goto('/');
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });

  const result = await page.locator('.atlas').evaluate((atlas) => {
    const rect = (selector: string) => {
      const element = atlas.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      const { top, right, bottom, left } = element.getBoundingClientRect();
      return { top, right, bottom, left };
    };
    const intersects = (first: ReturnType<typeof rect>, second: ReturnType<typeof rect>) =>
      first.left < second.right && first.right > second.left &&
      first.top < second.bottom && first.bottom > second.top;
    const label = rect('.a-label');
    const north = rect('.a-north');
    const gridLabel = rect('.a-grid-label');
    const scale = rect('.a-scale');
    return {
      topClear: !intersects(label, north),
      bottomClear: !intersects(gridLabel, scale),
      verticalClear: label.bottom <= gridLabel.top && north.bottom <= scale.top,
      featureDisplay: getComputedStyle(atlas.querySelector('.a-features') as Element).display,
      svgTextDisplay: getComputedStyle(atlas.querySelector('.a-svg text') as Element).display,
      textClipped: Array.from(
        atlas.querySelectorAll<HTMLElement>('.a-meta, .a-legend li, .t-step')
      ).some((element) =>
        element.scrollWidth > element.clientWidth + 1 ||
        element.scrollHeight > element.clientHeight + 1
      ),
      noOverflow: document.documentElement.scrollWidth <= window.innerWidth
    };
  });

  expect(result.topClear).toBe(true);
  expect(result.bottomClear).toBe(true);
  expect(result.verticalClear).toBe(true);
  expect(result.featureDisplay).not.toBe('none');
  expect(result.svgTextDisplay).toBe('none');
  expect(result.textClipped).toBe(false);
  expect(result.noOverflow).toBe(true);
});
```

- [ ] **Step 5: Add a dense fresh-page sweep across every layout boundary**

Append this test:

```ts
test('sweeps complete atlas geometry from 320 through 1538 pixels', async ({ context }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-short');
  test.setTimeout(120_000);

  const stepped = Array.from(
    { length: Math.floor((1538 - 320) / 32) + 1 },
    (_, index) => 320 + index * 32
  );
  const widths = [...new Set([
    ...stepped,
    320,
    321,
    719,
    720,
    721,
    959,
    960,
    961,
    1099,
    1100,
    1101,
    1440,
    1538
  ])].sort((a, b) => a - b);

  for (const width of widths) {
    const probe = await context.newPage();
    const height =
      width <= 430 ? 932 : width <= 720 ? 900 : width < 1100 ? 1024 : width === 1538 ? 789 : 1000;
    await probe.setViewportSize({ width, height });
    await probe.goto('/');

    const result = await probe.locator('.hero').evaluate((hero) => {
      const rect = (selector: string) => {
        const element = hero.querySelector<HTMLElement>(selector);
        if (!element) throw new Error(`Missing ${selector}`);
        const { top, right, bottom, left } = element.getBoundingClientRect();
        return { top, right, bottom, left };
      };
      const copy = rect('.h-copy');
      const atlas = rect('.atlas');
      const plate = rect('.a-plate');
      const svg = rect('.a-svg');
      const legend = rect('.a-legend');
      const trace = rect('.trace');
      const label = rect('.a-label');
      const north = rect('.a-north');
      const gridLabel = rect('.a-grid-label');
      const scale = rect('.a-scale');
      const cta = rect('.primary-action');
      const desktopOrder = copy.right <= atlas.left + 0.5;
      const stackedOrder = copy.bottom <= atlas.top + 0.5;
      const intersects = (first: ReturnType<typeof rect>, second: ReturnType<typeof rect>) =>
        first.left < second.right && first.right > second.left &&
        first.top < second.bottom && first.bottom > second.top;
      return {
        ordered: window.innerWidth >= 1100 ? desktopOrder : stackedOrder,
        svgContained:
          svg.left >= plate.left - 0.5 &&
          svg.right <= plate.right + 0.5 &&
          svg.top >= plate.top - 0.5 &&
          svg.bottom <= plate.bottom + 0.5,
        railsOrdered: plate.bottom <= legend.top + 0.5 && legend.bottom <= trace.top + 0.5,
        railsContained:
          legend.left >= atlas.left - 0.5 && legend.right <= atlas.right + 0.5 &&
          trace.left >= atlas.left - 0.5 && trace.right <= atlas.right + 0.5,
        marginaliaClear: !intersects(label, north) && !intersects(gridLabel, scale),
        shortDesktopContained:
          window.innerWidth !== 1538 ||
          (cta.bottom <= window.innerHeight + 0.5 && trace.bottom <= window.innerHeight + 0.5),
        noOverflow: document.documentElement.scrollWidth <= window.innerWidth
      };
    });

    expect(result.ordered, `layout order at ${width}px`).toBe(true);
    expect(result.svgContained, `SVG containment at ${width}px`).toBe(true);
    expect(result.railsOrdered, `atlas rails at ${width}px`).toBe(true);
    expect(result.railsContained, `atlas rail containment at ${width}px`).toBe(true);
    expect(result.marginaliaClear, `atlas marginalia at ${width}px`).toBe(true);
    expect(result.shortDesktopContained, `short desktop fold at ${width}px`).toBe(true);
    expect(result.noOverflow, `horizontal overflow at ${width}px`).toBe(true);
    await probe.close();
  }
});
```

- [ ] **Step 6: Run focused GREEN integration checks**

Run:

```bash
npm run e2e -- \
  --project=mobile-320 \
  --project=boundary-720 \
  --project=tablet-834 \
  --project=desktop-1100 \
  --project=desktop-short
```

Expected: all selected tests pass, including the dense sweep. If a geometry assertion fails, stop and report the exact width and rectangles; do not add an untested override.

- [ ] **Step 7: Run the complete ten-viewport matrix**

Run:

```bash
npm run e2e
```

Expected: zero failures across all ten projects. Skips are allowed only where a test explicitly targets `desktop` or `desktop-short`.

- [ ] **Step 8: Confirm CSS headroom and remove only proven dead selectors**

Run:

```bash
rg -n "territory-story-map|territory-map__|territory-hero|territory-trace|footer-leaf|leaf-fall" \
  src/styles.css src
npm run build
npm run budget
```

Expected:

- `rg` returns no obsolete selector or component references;
- JavaScript is `≤225000`;
- CSS is `≤16000`, with internal target `≤15600`.

Do not increase `bundle-budget.json`. If CSS exceeds the limit, consolidate repeated declarations in the exact new blocks before proceeding.

- [ ] **Step 9: Commit the complete browser contract**

```bash
git add apps/site/e2e/site.spec.ts apps/site/src/styles.css
git commit -m "test(site): lock atlas climate responsive contracts"
```

---

### Task 6: Perform Visual Review, Full Verification, and Independent Review

**Files:**

- Create temporarily, then delete before completion: `apps/site/e2e/capture-atlas.spec.ts`
- Read ignored evidence: `.superpowers/sdd/atlas-climate-base-sha.txt`
- Write ignored evidence only: `.superpowers/sdd/atlas-climate-final-report.md`
- Do not modify tracked production files unless an independent review identifies a concrete defect and a new failing test reproduces it.

**Interfaces:**

- Consumes the completed tracked branch.
- Produces fresh screenshots, exact gate output, independent review verdict, and clean-tree evidence.
- Does not produce a tracked capture helper or raise bundle limits.

- [ ] **Step 1: Create a temporary deterministic capture test**

Create `apps/site/e2e/capture-atlas.spec.ts` with this exact content:

```ts
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from '@playwright/test';

const captureProjects = new Set(['mobile-375', 'tablet-834', 'desktop', 'desktop-short']);

test('captures atlas climate review artifacts', async ({ page }, testInfo) => {
  test.skip(!captureProjects.has(testInfo.project.name));
  const output = resolve(process.cwd(), '../../.superpowers/sdd');
  await mkdir(output, { recursive: true });

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.screenshot({
    fullPage: true,
    path: resolve(output, `atlas-climate-${testInfo.project.name}.png`)
  });

  if (testInfo.project.name === 'desktop') {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.reload();
    await page.locator('.site-footer').screenshot({
      path: resolve(output, 'atlas-climate-footer-motion.png')
    });

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();
    await page.locator('.site-footer').screenshot({
      path: resolve(output, 'atlas-climate-footer-reduced.png')
    });
  }
});
```

- [ ] **Step 2: Capture the required viewports**

Run from `apps/site`:

```bash
npx playwright test capture-atlas.spec.ts \
  --project=mobile-375 \
  --project=tablet-834 \
  --project=desktop \
  --project=desktop-short
```

Expected: four full-page screenshots and two footer screenshots appear under repository-root `.superpowers/sdd/`.

- [ ] **Step 3: Inspect every screenshot at original resolution**

Use `view_image` on:

```text
.superpowers/sdd/atlas-climate-mobile-375.png
.superpowers/sdd/atlas-climate-tablet-834.png
.superpowers/sdd/atlas-climate-desktop.png
.superpowers/sdd/atlas-climate-desktop-short.png
.superpowers/sdd/atlas-climate-footer-motion.png
.superpowers/sdd/atlas-climate-footer-reduced.png
```

Accept only if all of these are true:

- the `1538×789` hero shows complete copy, CTA, atlas, legend, and Rastro;
- the atlas is framed rather than cropped and no dark side bands suggest missing content;
- marginalia, local signals, source links, caveats, and values are legible;
- desktop climate hierarchy has one lead register and three supporting registers, not generic cards;
- tablet/mobile use copy → CTA → atlas → legend → Rastro in normal flow;
- normal footer shows several leaves at distinct depths and positions;
- reduced footer shows four static leaves and unobstructed content;
- no leaf, source, map label, or value obscures another essential element.

If any item fails, write one failing component or E2E assertion for the observed defect before changing CSS. Do not make screenshot-only untested adjustments.

- [ ] **Step 4: Delete the temporary capture test**

Delete `apps/site/e2e/capture-atlas.spec.ts` with `apply_patch`, then run this check from the repository root:

```bash
test ! -e apps/site/e2e/capture-atlas.spec.ts
```

Expected: exit `0`.

- [ ] **Step 5: Run the complete fresh verification gate**

Run from `apps/site`:

```bash
npm run verify
npm audit --audit-level=high
```

Expected:

- lint has zero warnings;
- TypeScript has zero errors;
- every unit test passes;
- both budget tests pass;
- all ten Playwright projects pass;
- JavaScript is `≤225000`;
- CSS is `≤16000`;
- audit reports zero high/critical regressions introduced by this branch.

- [ ] **Step 6: Verify branch scope and repository integrity**

Run from the repository root:

```bash
export BASE_SHA="$(tr -d '\n' < .superpowers/sdd/atlas-climate-base-sha.txt)"
test "$(git rev-parse "$BASE_SHA")" = "$BASE_SHA"
git diff --check
git diff --cached --check
git diff --check "$BASE_SHA"..HEAD
git status --short --branch
git log --oneline --decorate -8
git diff --stat "$BASE_SHA"..HEAD
```

Expected:

- no whitespace errors;
- the immutable implementation commit range has no whitespace errors;
- no staged leftovers;
- no tracked modifications after the final commit;
- all implementation commits are limited to `apps/site`;
- spec and plan remain on the base branch, outside the implementation-only diff.

- [ ] **Step 7: Request independent whole-branch review**

Invoke `superpowers:requesting-code-review` and provide:

```text
Spec: docs/superpowers/specs/2026-07-11-angico-atlas-climate-context-design.md
Plan: docs/superpowers/plans/2026-07-11-angico-atlas-climate-context.md
Base: exact recorded $BASE_SHA from Execution Preflight
Head: current implementation HEAD
Review priorities:
- no private or fabricated impact data;
- exact source values, periods, caveats, links, target and rel;
- full atlas framing at 1538×789 and across 320–1538;
- no overlay between copy, map, legend or Rastro;
- twelve deterministic leaves and correct reduced motion;
- no external runtime requests;
- login/contact/auth boundaries unchanged;
- unchanged bundle limits and no new dependencies.
```

Expected: `APPROVED` with no Critical or Important findings. Any Critical or Important finding requires a new RED test, a focused fix, complete verification rerun, and another independent review.

- [ ] **Step 8: Write the ignored final evidence report**

Write `.superpowers/sdd/atlas-climate-final-report.md` containing:

```markdown
# Atlas Climate Final Report

## Commit range

- Base: paste the exact immutable `BASE_SHA` recorded in Execution Preflight.
- Head: paste the exact stdout of `git rev-parse HEAD` after the final implementation commit.

## TDD evidence

- Snapshot RED/GREEN: exact commands and outcomes
- Atlas semantic RED/GREEN: exact commands and outcomes
- Short-desktop geometry RED/GREEN: exact commands and outcomes
- Climate context RED/GREEN: exact commands and outcomes
- Twelve-leaf RED/GREEN: exact commands and outcomes
- Integration matrix: exact commands and outcomes

## Fresh gates

- `npm run verify`: exit code and pass/skip counts
- `npm audit --audit-level=high`: result
- JavaScript bytes: actual/225000
- CSS bytes: actual/16000
- `git diff --check`: result
- final `git status --short --branch`: result

## Visual inspection

- 1538×789: findings
- 1440×1000: findings
- 834×1112: findings
- 375×812: findings
- footer motion: findings
- footer reduced motion: findings

## Independent review

- Reviewer verdict
- Critical findings: 0
- Important findings: 0
- Minor findings: 0 or exact accepted follow-up
```

Replace each result description with the exact observed value. This report is ignored evidence and must not be committed.

## Final Spec Coverage Checklist

- Task 1: typed, versioned, source-backed climate snapshot with no runtime fetch.
- Task 2: full atlas, 38/62 hero, marginalia, local signals, complete Rastro, short-desktop framing.
- Task 3: displacement, El Niño/seca, urban shade, municipal water-disaster ledger and honesty boundary.
- Task 4: twelve deterministic leaves, three trajectories, full exit, four-leaf reduced-motion state.
- Task 5: source-aware keyboard order, network silence, Axe, ten viewports, dense 320–1538 sweep, unchanged budget.
- Task 6: required screenshots, fresh verification, scope check, evidence report, independent approval.
