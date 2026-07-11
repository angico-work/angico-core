# Angico Public Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the text-heavy Angico public entry with a map-led “Território em movimento” experience while keeping the authenticated login unchanged.

**Architecture:** The work stays inside `apps/site`. Four focused React components provide the demonstrative territory map, hero, concise product narrative, and animated footer; `Site` composes them and preserves the existing contact boundary. The map is local inline SVG plus CSS animation, with no operational fetches, map tiles, geolocation, or new runtime dependencies.

**Tech Stack:** React 19, TypeScript 6, Vite 8, semantic HTML, inline SVG, CSS animations, Vitest, Testing Library, Playwright, Axe.

## Global Constraints

- Modify only `apps/site` and implementation documentation; do not alter `apps/app`, `apps/api`, `/login`, or authentication.
- Keep the public site independent: no imports from `apps/app` or `apps/api`.
- Add no map or animation dependency; use inline SVG and CSS only.
- Make no request for tiles, geolocation, workspaces, territories, users, or other operational data.
- Use the exact member CTA “Já sou membro” and source its destination only from `VITE_APP_URL`.
- Use the exact primary CTA “Quero levar o Angico ao meu território” and target `#contato`.
- Label the map exactly “Demonstração visual — sem dados operacionais”.
- Present only the demonstrative sequence `Observação → Ação → Evidência → Resultado`; do not add metrics, percentages, scores, seals, or impact claims.
- Play the map sequence once over 6 seconds; loop only one footer leaf at 9 seconds.
- Under `prefers-reduced-motion: reduce`, show the complete map and a resting leaf with no animation.
- Preserve the contact form’s configured, unavailable, submitting, success, and error behavior.
- Preserve empty URL honesty: no implicit app or contact destination.
- Pass responsive checks at 320, 375, 430, and 1440 px with no horizontal overflow.
- Keep bundle limits unchanged: JavaScript ≤ 225,000 bytes and CSS ≤ 16,000 bytes.
- Use Node.js `>=22 <23` and the existing locked dependencies.

---

## File Structure

### Create

- `apps/site/src/components/TerritoryStoryMap.tsx` — local SVG cartography, Rastro markers, and equivalent textual legend.
- `apps/site/src/components/TerritoryStoryMap.test.tsx` — map semantics and data-honesty contract.
- `apps/site/src/components/TerritoryHero.tsx` — first-fold copy, contact CTA, and map composition.
- `apps/site/src/components/TerritoryHero.test.tsx` — hero copy, CTA, and separation from member access.
- `apps/site/src/components/WhyAngico.tsx` — three differentiators, public/private boundary, and four-step explanation.
- `apps/site/src/components/WhyAngico.test.tsx` — concise narrative order and boundary contract.
- `apps/site/src/components/AnimatedLeafFooter.tsx` — footer content and official leaf hook.
- `apps/site/src/components/AnimatedLeafFooter.test.tsx` — footer identity and decorative-leaf semantics.

### Modify

- `apps/site/src/Site.tsx:1-183` — compose the new public journey and keep member access in the header.
- `apps/site/src/Site.test.tsx:16-61,143-159` — replace obsolete hero/trace expectations with the new integration contract; keep contact submission tests.
- `apps/site/src/components/ContactSection.tsx:4-11,43-103` — remove the member URL dependency and align the contact heading with the approved CTA.
- `apps/site/src/styles.css:1-889` — replace obsolete public-page CSS with the approved map-led visual system and motion rules.
- `apps/site/e2e/site.spec.ts:4-56` — validate new content, responsive behavior, no external map requests, and both motion modes.

### Delete

- `apps/site/src/components/TracePath.tsx` — the seven-step text-heavy trace is replaced by `WhyAngico` and `TerritoryStoryMap`.

---

### Task 1: Demonstrative Territory Map

**Files:**
- Create: `apps/site/src/components/TerritoryStoryMap.test.tsx`
- Create: `apps/site/src/components/TerritoryStoryMap.tsx`

**Interfaces:**
- Consumes: no props and no external data.
- Produces: `TerritoryStoryMap(): JSX.Element` with `.territory-story-map`, `.territory-map__svg`, four stable trace-step modifiers, and the exact demonstration label.

- [ ] **Step 1: Write the failing map contract test**

```tsx
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import TerritoryStoryMap from './TerritoryStoryMap';

afterEach(cleanup);

describe('TerritoryStoryMap', () => {
  it('describes a demonstrative four-step trace without operational claims', () => {
    const { container } = render(<TerritoryStoryMap />);

    expect(screen.getByText('Demonstração visual — sem dados operacionais')).toBeInTheDocument();
    const trace = screen.getByRole('list', { name: 'Percurso demonstrativo do território' });
    const steps = within(trace).getAllByRole('listitem');

    expect(steps).toHaveLength(4);
    expect(within(steps[0]).getByText('Observação')).toBeInTheDocument();
    expect(within(steps[1]).getByText('Ação')).toBeInTheDocument();
    expect(within(steps[2]).getByText('Evidência')).toBeInTheDocument();
    expect(within(steps[3]).getByText('Resultado')).toBeInTheDocument();
    expect(container.querySelector('.territory-map__svg')).toHaveAttribute('aria-hidden', 'true');
    expect(container).not.toHaveTextContent(/\d+%|pessoas impactadas|certificado|pontuação/i);
  });
});
```

- [ ] **Step 2: Run the map test and verify the missing module failure**

Run from `apps/site`:

```bash
npm test -- --run src/components/TerritoryStoryMap.test.tsx
```

Expected: FAIL because `./TerritoryStoryMap` does not exist.

- [ ] **Step 3: Implement the local SVG and textual trace**

Create `apps/site/src/components/TerritoryStoryMap.tsx`:

```tsx
const traceSteps = [
  {
    id: 'observation',
    title: 'Observação',
    description: 'O que foi percebido no lugar.'
  },
  {
    id: 'action',
    title: 'Ação',
    description: 'A resposta ligada à sua origem.'
  },
  {
    id: 'evidence',
    title: 'Evidência',
    description: 'Autoria e momento preservados.'
  },
  {
    id: 'result',
    title: 'Resultado',
    description: 'A mudança sem perder o percurso.'
  }
] as const;

export default function TerritoryStoryMap() {
  return (
    <figure className="territory-story-map" aria-labelledby="territory-map-caption">
      <div className="territory-map__canvas">
        <span className="territory-map__demo-label">
          Demonstração visual — sem dados operacionais
        </span>

        <svg
          className="territory-map__svg"
          viewBox="0 0 1200 760"
          aria-hidden="true"
          focusable="false"
        >
          <g className="territory-map__layer territory-map__layer--base">
            <rect width="1200" height="760" fill="#dfeae6" />
            <path
              className="territory-map__boundary"
              d="M62 92 338 24l181 98 291-66 326 121-76 221 92 210-254 116-233-62-238 72-190-113 54-192-204-127Z"
            />
            <g className="territory-map__contours">
              <path d="M38 232c172-82 316-54 462 26s310 96 656-24" />
              <path d="M24 466c207-69 350-38 503 49s340 82 645-19" />
              <path d="M189 26c-28 156 32 252 14 391-15 117-2 211 66 337" />
              <path d="M729 6c-63 151-19 267 21 371 54 139 20 255-35 383" />
            </g>
          </g>

          <g className="territory-map__layer territory-map__layer--details">
            <path
              className="territory-map__river-bank"
              d="M-38 118c208 77 236 232 432 247 226 18 272-185 494-160 116 13 202 79 350 149"
            />
            <path
              className="territory-map__river"
              d="M-38 118c208 77 236 232 432 247 226 18 272-185 494-160 116 13 202 79 350 149"
            />
            <path
              className="territory-map__road"
              d="M71 720c159-181 259-271 437-327 221-70 346-239 630-345"
            />
            <path
              className="territory-map__road"
              d="M168 37c126 185 251 249 286 454 22 130 123 202 326 257"
            />
            <path
              className="territory-map__area territory-map__area--care"
              d="m168 389 220-101 128 104-52 188-220 53-141-128Z"
            />
            <path
              className="territory-map__area territory-map__area--community"
              d="m696 421 231-95 163 100-68 179-214 37-151-106Z"
            />
            <text x="704" y="246">Curso d'água</text>
            <text x="126" y="682">Caminho local</text>
            <text x="218" y="454">Área acompanhada</text>
            <text x="782" y="478">Zona de cuidado</text>
          </g>

          <g className="territory-map__trace">
            <path
              className="territory-map__route territory-map__route--one"
              pathLength="1"
              d="M206 576C342 483 433 422 558 372"
            />
            <path
              className="territory-map__route territory-map__route--two"
              pathLength="1"
              d="M558 372C679 321 758 260 865 186"
            />
            <path
              className="territory-map__route territory-map__route--three"
              pathLength="1"
              d="M865 186C954 151 1026 139 1100 118"
            />

            <g className="territory-map__marker territory-map__marker--observation">
              <circle cx="206" cy="576" r="25" />
              <text x="206" y="582">1</text>
            </g>
            <g className="territory-map__marker territory-map__marker--action">
              <rect x="536" y="350" width="44" height="44" transform="rotate(45 558 372)" />
              <text x="558" y="378">2</text>
            </g>
            <g className="territory-map__marker territory-map__marker--evidence">
              <circle cx="865" cy="186" r="25" />
              <circle cx="865" cy="186" r="10" className="territory-map__marker-core" />
              <text x="865" y="192">3</text>
            </g>
            <g className="territory-map__marker territory-map__marker--result">
              <path d="m1100 88 30 30-30 30-30-30Z" />
              <text x="1100" y="124">4</text>
            </g>
          </g>
        </svg>
      </div>

      <figcaption id="territory-map-caption" className="territory-trace">
        <span className="territory-trace__label">Rastro demonstrativo</span>
        <ol aria-label="Percurso demonstrativo do território">
          {traceSteps.map((step, index) => (
            <li
              className={'territory-trace__step territory-trace__step--' + step.id}
              key={step.id}
            >
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

- [ ] **Step 4: Run the focused test**

Run:

```bash
npm test -- --run src/components/TerritoryStoryMap.test.tsx
```

Expected: 1 test passes.

- [ ] **Step 5: Commit the map component**

```bash
git add apps/site/src/components/TerritoryStoryMap.tsx apps/site/src/components/TerritoryStoryMap.test.tsx
git commit -m "feat(site): add demonstrative territory map"
```

---

### Task 2: Map-Led Hero

**Files:**
- Create: `apps/site/src/components/TerritoryHero.test.tsx`
- Create: `apps/site/src/components/TerritoryHero.tsx`

**Interfaces:**
- Consumes: `TerritoryStoryMap(): JSX.Element` from Task 1.
- Produces: `TerritoryHero(): JSX.Element` with `#inicio` and a primary `#contato` link; it deliberately accepts no `appUrl`.

- [ ] **Step 1: Write the failing hero test**

```tsx
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import TerritoryHero from './TerritoryHero';

afterEach(cleanup);

describe('TerritoryHero', () => {
  it('leads with the territory and sends interested visitors to contact', () => {
    render(<TerritoryHero />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'O trabalho continua. A memória também.' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Quero levar o Angico ao meu território' })
    ).toHaveAttribute('href', '#contato');
    expect(screen.getByText('Demonstração visual — sem dados operacionais')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Já sou membro' })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the hero test and verify it fails**

Run:

```bash
npm test -- --run src/components/TerritoryHero.test.tsx
```

Expected: FAIL because `./TerritoryHero` does not exist.

- [ ] **Step 3: Implement the hero**

Create `apps/site/src/components/TerritoryHero.tsx`:

```tsx
import TerritoryStoryMap from './TerritoryStoryMap';

export default function TerritoryHero() {
  return (
    <section id="inicio" className="territory-hero" aria-labelledby="hero-title">
      <div className="site-frame territory-hero__content">
        <div className="territory-hero__copy">
          <p className="eyebrow">— Memória operacional socioambiental</p>
          <h1 id="hero-title">O trabalho continua. A memória também.</h1>
          <p className="territory-hero__summary">
            O Angico conecta território, autoria, evidência e resultado para que uma ação possa
            ser retomada, compreendida e demonstrada ao longo do tempo.
          </p>
          <a className="primary-action" href="#contato">
            Quero levar o Angico ao meu território
          </a>
        </div>
      </div>

      <div className="territory-hero__map">
        <TerritoryStoryMap />
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run hero and map tests**

Run:

```bash
npm test -- --run src/components/TerritoryHero.test.tsx src/components/TerritoryStoryMap.test.tsx
```

Expected: 2 tests pass.

- [ ] **Step 5: Commit the hero**

```bash
git add apps/site/src/components/TerritoryHero.tsx apps/site/src/components/TerritoryHero.test.tsx
git commit -m "feat(site): lead public entry with territory"
```

---

### Task 3: Concise Angico Narrative

**Files:**
- Create: `apps/site/src/components/WhyAngico.test.tsx`
- Create: `apps/site/src/components/WhyAngico.tsx`

**Interfaces:**
- Consumes: no props.
- Produces: `WhyAngico(): JSX.Element` with anchor targets `#unico` and `#como-funciona`, a three-item differentiator list, a four-item journey list, and the public/private boundary statement.

- [ ] **Step 1: Write the failing narrative test**

```tsx
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import WhyAngico from './WhyAngico';

afterEach(cleanup);

describe('WhyAngico', () => {
  it('keeps the differentiators and operating path concise and ordered', () => {
    render(<WhyAngico />);

    const differences = screen.getByRole('list', { name: 'Diferenciais do Angico' });
    const differenceItems = within(differences).getAllByRole('listitem');
    expect(differenceItems).toHaveLength(3);
    expect(within(differenceItems[0]).getByText('Território com contexto')).toBeInTheDocument();
    expect(within(differenceItems[1]).getByText('Evidência com autoria')).toBeInTheDocument();
    expect(within(differenceItems[2]).getByText('Rastro sem lacunas ocultas')).toBeInTheDocument();

    const journey = screen.getByRole('list', { name: 'Como o Angico funciona' });
    expect(within(journey).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      expect.stringContaining('Observar'),
      expect.stringContaining('Agir'),
      expect.stringContaining('Comprovar'),
      expect.stringContaining('Continuar')
    ]);
    expect(
      screen.getByText('O site demonstra o princípio. O aplicativo autenticado guarda o trabalho.')
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the narrative test and verify it fails**

Run:

```bash
npm test -- --run src/components/WhyAngico.test.tsx
```

Expected: FAIL because `./WhyAngico` does not exist.

- [ ] **Step 3: Implement the differentiators and four-step path**

Create `apps/site/src/components/WhyAngico.tsx`:

```tsx
const differentiators = [
  {
    title: 'Território com contexto',
    description: 'Localização, pessoas e trabalho permanecem ligados ao registro.'
  },
  {
    title: 'Evidência com autoria',
    description: 'A prova preserva quem registrou, quando e de onde veio.'
  },
  {
    title: 'Rastro sem lacunas ocultas',
    description: 'O Angico mostra o que está conectado e o que ainda falta registrar.'
  }
] as const;

const journey = [
  {
    verb: 'Observar',
    description: 'Registrar o que acontece no lugar.'
  },
  {
    verb: 'Agir',
    description: 'Organizar a resposta e manter responsáveis e recursos ligados.'
  },
  {
    verb: 'Comprovar',
    description: 'Anexar evidência com origem e autoria.'
  },
  {
    verb: 'Continuar',
    description: 'Acompanhar resultados, lacunas e próximos registros.'
  }
] as const;

export default function WhyAngico() {
  return (
    <>
      <section id="unico" className="why-angico site-frame" aria-labelledby="why-title">
        <div className="why-angico__heading">
          <p className="section-label">— Por que é único</p>
          <h2 id="why-title">O resultado nunca aparece sem a sua origem.</h2>
          <p>
            O Angico não separa a mudança das pessoas, do território e da evidência que a
            tornaram possível.
          </p>
        </div>

        <ul className="why-angico__list" aria-label="Diferenciais do Angico">
          {differentiators.map((item) => (
            <li key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </li>
          ))}
        </ul>

        <p className="why-angico__boundary">
          O site demonstra o princípio. O aplicativo autenticado guarda o trabalho.
        </p>
      </section>

      <section
        id="como-funciona"
        className="journey site-frame"
        aria-labelledby="journey-title"
      >
        <div className="journey__heading">
          <p className="section-label">— Como funciona</p>
          <h2 id="journey-title">Do primeiro registro ao próximo passo.</h2>
        </div>
        <ol className="journey__list" aria-label="Como o Angico funciona">
          {journey.map((item, index) => (
            <li key={item.verb}>
              <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <h3>{item.verb}</h3>
              <p>{item.description}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
```

- [ ] **Step 4: Run the focused test**

Run:

```bash
npm test -- --run src/components/WhyAngico.test.tsx
```

Expected: 1 test passes.

- [ ] **Step 5: Commit the narrative**

```bash
git add apps/site/src/components/WhyAngico.tsx apps/site/src/components/WhyAngico.test.tsx
git commit -m "feat(site): explain the Angico difference concisely"
```

---

### Task 4: Animated Leaf Footer Structure

**Files:**
- Create: `apps/site/src/components/AnimatedLeafFooter.test.tsx`
- Create: `apps/site/src/components/AnimatedLeafFooter.tsx`

**Interfaces:**
- Consumes: no props.
- Produces: `AnimatedLeafFooter(): JSX.Element` with the existing local wordmark, a return link, and one `.footer-leaf` decorative hook.

- [ ] **Step 1: Write the failing footer test**

```tsx
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import AnimatedLeafFooter from './AnimatedLeafFooter';

afterEach(cleanup);

describe('AnimatedLeafFooter', () => {
  it('keeps essential footer content and exposes exactly one decorative leaf', () => {
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
    const leaves = container.querySelectorAll('.footer-leaf');
    expect(leaves).toHaveLength(1);
    expect(leaves[0]).toHaveAttribute('aria-hidden', 'true');
  });
});
```

- [ ] **Step 2: Run the footer test and verify it fails**

Run:

```bash
npm test -- --run src/components/AnimatedLeafFooter.test.tsx
```

Expected: FAIL because `./AnimatedLeafFooter` does not exist.

- [ ] **Step 3: Implement the footer markup**

Create `apps/site/src/components/AnimatedLeafFooter.tsx`:

```tsx
export default function AnimatedLeafFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-leaf-stage" aria-hidden="true">
        <span className="footer-leaf" aria-hidden="true" />
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

- [ ] **Step 4: Run the footer test**

Run:

```bash
npm test -- --run src/components/AnimatedLeafFooter.test.tsx
```

Expected: 1 test passes.

- [ ] **Step 5: Commit the footer structure**

```bash
git add apps/site/src/components/AnimatedLeafFooter.tsx apps/site/src/components/AnimatedLeafFooter.test.tsx
git commit -m "feat(site): add leaf footer structure"
```

---

### Task 5: Public Journey Composition and Contact Boundary

**Files:**
- Modify: `apps/site/src/Site.test.tsx:16-61,143-159`
- Modify: `apps/site/src/Site.tsx:1-183`
- Modify: `apps/site/src/components/ContactSection.tsx:4-11,43-103`
- Delete: `apps/site/src/components/TracePath.tsx`

**Interfaces:**
- Consumes: `TerritoryHero`, `WhyAngico`, `AnimatedLeafFooter`, `appUrl: string`, and `contactApiUrl: string`.
- Produces: `Site({ appUrl, contactApiUrl }): JSX.Element` where only the header consumes `appUrl` and only `ContactSection` consumes `contactApiUrl`.

- [ ] **Step 1: Replace obsolete integration expectations with failing new expectations**

In `apps/site/src/Site.test.tsx`, delete the tests currently at lines 17-61 and 143-159. Insert the following block immediately after `describe('Site', () => {`. Keep the contact submission tests currently at lines 63-141 unchanged and place them after this block.

```tsx
  it('leads with the territory, routes interest to contact and keeps member access separate', () => {
    render(<Site {...urls} />);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'O trabalho continua. A memória também.'
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Quero levar o Angico ao meu território' })
    ).toHaveAttribute('href', '#contato');
    expect(screen.getByRole('link', { name: 'Já sou membro' })).toHaveAttribute(
      'href',
      urls.appUrl
    );
    expect(screen.getByText('Demonstração visual — sem dados operacionais')).toBeInTheDocument();
  });

  it('renders the versioned Angico identity assets', () => {
    render(<Site {...urls} />);

    expect(
      screen.getByRole('link', { name: 'Angico, início' }).querySelector('.wordmark-image')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Angico, voltar ao início' }).querySelector('img')
    ).toHaveAttribute('src', '/angico-logo-white.png');
  });

  it('integrates the concise operating path in canonical public order', () => {
    render(<Site {...urls} />);

    const journey = screen.getByRole('list', { name: 'Como o Angico funciona' });
    const steps = within(journey).getAllByRole('listitem');
    expect(steps).toHaveLength(4);
    expect(within(steps[0]).getByText('Observar')).toBeInTheDocument();
    expect(within(steps[1]).getByText('Agir')).toBeInTheDocument();
    expect(within(steps[2]).getByText('Comprovar')).toBeInTheDocument();
    expect(within(steps[3]).getByText('Continuar')).toBeInTheDocument();
    expect(screen.queryByText('Observação ou potencialidade')).not.toBeInTheDocument();
  });

  it('does not render implicit destinations when public URLs are absent', () => {
    render(<Site appUrl="" contactApiUrl="" />);

    expect(screen.queryByRole('form', { name: 'Contato' })).not.toBeInTheDocument();
    expect(screen.getByText('Acesso de membros indisponível')).toBeInTheDocument();
    expect(
      screen.getByText('O formulário só será exibido quando houver um destino público configurado.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Já sou membro' })).not.toBeInTheDocument();
  });

  it('states the public and authenticated product boundary', () => {
    render(<Site {...urls} />);

    expect(
      screen.getByText('O site demonstra o princípio. O aplicativo autenticado guarda o trabalho.')
    ).toBeInTheDocument();
    expect(screen.getByText(/sem dados operacionais/i)).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run the site test and verify the old composition fails**

Run:

```bash
npm test -- --run src/Site.test.tsx
```

Expected: FAIL because the old heading, member CTA, and trace composition are still rendered.

- [ ] **Step 3: Replace `Site` with the approved composition**

Replace `apps/site/src/Site.tsx` with:

```tsx
import AnimatedLeafFooter from './components/AnimatedLeafFooter';
import ContactSection from './components/ContactSection';
import TerritoryHero from './components/TerritoryHero';
import WhyAngico from './components/WhyAngico';

export interface SiteProps {
  appUrl: string;
  contactApiUrl: string;
}

export default function Site({ appUrl, contactApiUrl }: SiteProps) {
  return (
    <div className="site-shell">
      <a className="skip-link" href="#conteudo">
        Ir para o conteúdo
      </a>

      <header className="site-header">
        <div className="site-frame header-inner">
          <a className="wordmark" href="#inicio" aria-label="Angico, início">
            <span className="wordmark-image" aria-hidden="true" />
          </a>

          <nav aria-label="Navegação principal">
            <a href="#unico">Por que é único</a>
            <a href="#como-funciona">Como funciona</a>
            {appUrl ? (
              <a className="header-access" href={appUrl}>
                Já sou membro
              </a>
            ) : (
              <span className="header-access header-access--unavailable">
                Acesso de membros indisponível
              </span>
            )}
          </nav>
        </div>
      </header>

      <main id="conteudo">
        <TerritoryHero />
        <WhyAngico />
        <ContactSection contactApiUrl={contactApiUrl} />
      </main>

      <AnimatedLeafFooter />
    </div>
  );
}
```

- [ ] **Step 4: Narrow `ContactSection` to the contact endpoint and approved copy**

In `apps/site/src/components/ContactSection.tsx`, replace the props and function signature with:

```tsx
interface ContactSectionProps {
  contactApiUrl: string;
}

type SubmissionState = 'idle' | 'submitting' | 'success' | 'error';

export default function ContactSection({ contactApiUrl }: ContactSectionProps) {
```

Replace the heading block at the start of the returned section with:

```tsx
      <div className="contact-heading">
        <p className="section-label">— Contato</p>
        <h2 id="contact-title">Quero levar o Angico ao meu território</h2>
        <p>
          Conte sobre a organização, comunidade ou equipe de campo que precisa preservar e
          continuar o trabalho no território.
        </p>
      </div>
```

Replace the unavailable block with:

```tsx
      ) : (
        <div className="contact-unavailable">
          <p className="register-code">Canal em preparação</p>
          <p>O formulário só será exibido quando houver um destino público configurado.</p>
        </div>
      )}
```

Keep `handleSubmit`, the configured form, and all submission feedback strings unchanged.

- [ ] **Step 5: Remove the obsolete trace component**

Delete the file with `apply_patch`:

```diff
*** Begin Patch
*** Delete File: apps/site/src/components/TracePath.tsx
*** End Patch
```

- [ ] **Step 6: Run all component tests**

Run:

```bash
npm test -- --run
```

Expected: all `apps/site` Vitest tests pass, including the unchanged contact submission tests.

- [ ] **Step 7: Commit the public composition**

```bash
git add apps/site/src/Site.tsx apps/site/src/Site.test.tsx apps/site/src/components/ContactSection.tsx apps/site/src/components/TracePath.tsx
git commit -m "refactor(site): compose the map-led public journey"
```

---

### Task 6: Visual System, Motion, and Browser Contracts

**Files:**
- Modify: `apps/site/e2e/site.spec.ts:4-56`
- Modify: `apps/site/src/styles.css:1-889`

**Interfaces:**
- Consumes: stable classes emitted by Tasks 1-5.
- Produces: a responsive map-led page; one-shot map animation names `map-base-reveal`, `map-detail-reveal`, `trace-marker-reveal`, `trace-route-draw`; infinite footer animation `leaf-fall`; static reduced-motion state.

- [ ] **Step 1: Replace the E2E test with failing visual and motion contracts**

Replace `apps/site/e2e/site.spec.ts` with:

```ts
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('keeps the public journey responsive, keyboard-accessible and quiet', async ({ page }) => {
  const errors: string[] = [];
  const externalMapRequests: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (/openstreetmap|mapbox|tile\.|\/tiles\//i.test(request.url())) {
      externalMapRequests.push(request.url());
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
  await expect(page.getByRole('link', { name: 'Já sou membro' })).toHaveAttribute(
    'href',
    'http://127.0.0.1:4176/login'
  );
  await expect(
    page.getByRole('link', { name: 'Quero levar o Angico ao meu território' })
  ).toHaveAttribute('href', '#contato');
  await expect(page.getByText('Demonstração visual — sem dados operacionais')).toBeVisible();

  const overflowingElements = await page.locator('body *').evaluateAll((elements) => elements.flatMap((element) => {
    const rect = element.getBoundingClientRect();
    if (rect.left >= -0.5 && rect.right <= window.innerWidth + 0.5) return [];
    return [element.tagName.toLowerCase() + '.' + element.className + ': ' + rect.left + '/' + rect.right];
  }));
  expect(overflowingElements).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => window.innerWidth)
  );

  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  await expect(page.locator('.territory-map__layer--base')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.footer-leaf')).toHaveCSS('animation-name', 'none');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');

  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Ir para o conteúdo' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#conteudo$/);

  await page.getByRole('link', { name: 'Por que é único' }).click();
  await expect(page).toHaveURL(/#unico$/);

  await page.getByLabel('Nome').fill('Ana Ribeiro');
  await page.getByLabel('E-mail').fill('ana@example.org');
  await page.getByLabel('Mensagem').fill('Quero organizar a memória do território.');
  await page.getByLabel('Mensagem').press('Tab');
  await expect(page.getByRole('button', { name: 'Enviar mensagem' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toHaveText('Mensagem enviada.');

  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(accessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical'))
    .toEqual([]);
  expect(externalMapRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test('plays the map once and loops only the leaf when motion is allowed', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');

  await expect(page.locator('.territory-map__layer--base')).toHaveCSS(
    'animation-name',
    'map-base-reveal'
  );
  await expect(page.locator('.territory-map__layer--base')).toHaveCSS(
    'animation-iteration-count',
    '1'
  );
  await expect(page.locator('.territory-map__layer--details')).toHaveCSS(
    'animation-delay',
    '0.8s'
  );
  await expect(page.locator('.territory-map__marker--observation')).toHaveCSS(
    'animation-delay',
    '1.8s'
  );
  await expect(page.locator('.territory-map__marker--action')).toHaveCSS(
    'animation-delay',
    '2.6s'
  );
  await expect(page.locator('.territory-map__marker--evidence')).toHaveCSS(
    'animation-delay',
    '3.4s'
  );
  await expect(page.locator('.territory-map__marker--result')).toHaveCSS(
    'animation-delay',
    '4.2s'
  );
  await expect(page.locator('.territory-map__route--one')).toHaveCSS(
    'animation-name',
    'trace-route-draw'
  );
  await expect(page.locator('.footer-leaf')).toHaveCSS('animation-name', 'leaf-fall');
  await expect(page.locator('.footer-leaf')).toHaveCSS('animation-duration', '9s');
  await expect(page.locator('.footer-leaf')).toHaveCSS('animation-iteration-count', 'infinite');
});
```

- [ ] **Step 2: Run the desktop E2E project and verify the unstyled motion contract fails**

Run:

```bash
npm run e2e -- --project=desktop
```

Expected: FAIL because the map and leaf animation names are `none` under normal motion.

- [ ] **Step 3: Replace `styles.css` with the focused final stylesheet**

Replace `apps/site/src/styles.css` with the following complete stylesheet:

```css
:root {
  --brand-blue: #004b6c;
  --brand-aqua: #34aba6;
  --brand-ivory: #f5f2ec;
  --brand-ink: #3c4f54;
  --brand-deep: #003952;
  --mata: var(--brand-blue);
  --agua: var(--brand-aqua);
  --folha: var(--brand-aqua);
  --fibra: var(--brand-ivory);
  --grafite: var(--brand-ink);
  --font-display: "Garet Heavy", Garet, "Bricolage Grotesque", sans-serif;
  --font-body: "Garet Book", Garet, "DM Sans", sans-serif;
  --font-label: "Space Mono", "SFMono-Regular", Consolas, monospace;
  color: var(--grafite);
  background: var(--fibra);
  font-family: var(--font-body);
  font-synthesis: none;
  text-rendering: optimizeLegibility;
}

* { box-sizing: border-box; }
html { min-width: 320px; scroll-behavior: smooth; scroll-padding-top: 24px; }
body { min-width: 320px; margin: 0; background: var(--fibra); }
body, button, input, textarea { font: inherit; }
button, input, textarea { color: inherit; }
a { color: inherit; }
::selection { color: var(--mata); background: var(--folha); }
:focus-visible { outline: 3px solid var(--mata); outline-offset: 4px; }

h1, h2, h3, p { margin-top: 0; }
h1, h2, h3 { color: var(--mata); font-family: var(--font-display); }
h1 { font-size: clamp(3rem, 7vw, 6.2rem); line-height: .95; letter-spacing: -.055em; text-wrap: balance; }
h2 { font-size: clamp(2.2rem, 4.4vw, 4.2rem); line-height: 1; letter-spacing: -.045em; text-wrap: balance; }
h3 { font-size: clamp(1.2rem, 2vw, 1.55rem); line-height: 1.15; letter-spacing: -.025em; }

.site-frame { width: min(1180px, calc(100% - 48px)); margin-inline: auto; }
.skip-link { position: fixed; z-index: 100; top: 12px; left: 12px; padding: 10px 14px; color: var(--fibra); background: var(--mata); font-weight: 600; transform: translateY(-160%); }
.skip-link:focus { transform: translateY(0); }

.site-header { position: relative; z-index: 20; border-bottom: 1px solid color-mix(in srgb, var(--mata) 22%, transparent); background: var(--fibra); }
.header-inner { min-height: 82px; display: flex; align-items: center; justify-content: space-between; gap: 32px; }
.wordmark { min-height: 44px; display: inline-flex; align-items: center; color: var(--mata); text-decoration: none; }
.wordmark-image { width: 138px; height: 39px; background: var(--mata); -webkit-mask: url('/angico-logo-white.png') left center / contain no-repeat; mask: url('/angico-logo-white.png') left center / contain no-repeat; }
.site-header nav { display: flex; align-items: center; gap: clamp(12px, 2.4vw, 30px); }
.site-header nav a { min-height: 44px; display: inline-flex; align-items: center; font-size: .92rem; font-weight: 600; text-decoration: none; }
.site-header nav a:not(.header-access):hover { text-decoration: underline; text-decoration-color: var(--folha); text-decoration-thickness: 2px; text-underline-offset: 6px; }
.header-access { min-height: 38px; padding-inline: 16px; display: inline-flex; align-items: center; border: 1px solid var(--mata); font-size: .86rem; font-weight: 600; text-decoration: none; }
.site-header a.header-access:hover { color: var(--fibra); background: var(--mata); }
.header-access--unavailable { max-width: 190px; border-color: color-mix(in srgb, var(--mata) 35%, transparent); color: color-mix(in srgb, var(--grafite) 72%, transparent); line-height: 1.25; }

.eyebrow, .section-label, .register-code, .territory-map__demo-label, .territory-trace__label { margin: 0; font-family: var(--font-label); font-size: .7rem; font-weight: 700; letter-spacing: .1em; line-height: 1.4; text-transform: uppercase; }

.primary-action, form button { min-height: 50px; padding-inline: 22px; border: 1px solid var(--mata); display: inline-flex; align-items: center; justify-content: center; color: var(--fibra); background: var(--mata); cursor: pointer; font-family: var(--font-display); font-weight: 700; text-decoration: none; transition: background-color 160ms ease, border-color 160ms ease; }
.primary-action:hover, form button:hover { border-color: var(--agua); background: var(--brand-deep); }
.text-action { min-height: 44px; display: inline-flex; align-items: center; color: var(--mata); font-weight: 600; text-decoration-color: var(--agua); text-decoration-thickness: 2px; text-underline-offset: 6px; }

.territory-hero { min-height: calc(100svh - 82px); position: relative; display: grid; overflow: clip; isolation: isolate; color: #fff; background: var(--brand-deep); }
.territory-hero::after { position: absolute; z-index: 1; inset: 0; background: linear-gradient(90deg, rgba(0,57,82,.96) 0%, rgba(0,57,82,.78) 42%, rgba(0,57,82,.16) 72%, rgba(0,57,82,.38) 100%); content: ""; pointer-events: none; }
.territory-hero__content, .territory-hero__map { grid-area: 1 / 1; }
.territory-hero__content { z-index: 3; display: grid; align-content: end; padding-block: clamp(64px, 9vw, 120px); pointer-events: none; }
.territory-hero__copy { max-width: 650px; pointer-events: auto; }
.territory-hero .eyebrow, .territory-hero h1 { color: #fff; }
.territory-hero h1 { margin: 20px 0 24px; }
.territory-hero__summary { max-width: 58ch; margin-bottom: 30px; color: rgba(255,255,255,.8); font-size: clamp(1.05rem, 1.5vw, 1.22rem); line-height: 1.6; }
.territory-hero .primary-action { border-color: var(--agua); color: var(--brand-deep); background: var(--agua); }
.territory-hero .primary-action:hover { border-color: #fff; background: #fff; }
.territory-hero__map { min-width: 0; min-height: calc(100svh - 82px); }

.territory-story-map { min-height: 100%; position: relative; margin: 0; }
.territory-map__canvas, .territory-map__svg { width: 100%; min-height: inherit; height: 100%; }
.territory-map__canvas { position: absolute; inset: 0; overflow: hidden; }
.territory-map__svg { display: block; object-fit: cover; }
.territory-map__demo-label { position: absolute; z-index: 4; top: 22px; right: 24px; padding: 7px 9px; border: 1px solid rgba(0,75,108,.32); color: var(--mata); background: rgba(245,242,236,.92); }
.territory-map__boundary { fill: #cfdfd8; stroke: #75a092; stroke-width: 3; }
.territory-map__contours { fill: none; stroke: #8dac9f; stroke-width: 2; opacity: .7; }
.territory-map__river-bank { fill: none; stroke: #f7f4ee; stroke-width: 48; opacity: .9; }
.territory-map__river { fill: none; stroke: var(--agua); stroke-width: 9; opacity: .82; }
.territory-map__road { fill: none; stroke: #f8f5ef; stroke-width: 16; stroke-dasharray: 24 12; }
.territory-map__area { stroke-width: 2; }
.territory-map__area--care { fill: rgba(104,175,142,.56); stroke: #2d8b73; }
.territory-map__area--community { fill: rgba(232,214,168,.65); stroke: #a88436; }
.territory-map__layer text { fill: var(--grafite); font-family: var(--font-label); font-size: 18px; }
.territory-map__route { fill: none; stroke: var(--mata); stroke-width: 6; stroke-dasharray: 14 12; }
.territory-map__marker { color: #fff; fill: var(--mata); filter: drop-shadow(0 4px 5px rgba(0,57,82,.28)); }
.territory-map__marker--observation { fill: var(--agua); }
.territory-map__marker--action, .territory-map__marker--result { fill: var(--brand-deep); }
.territory-map__marker--evidence { fill: var(--mata); }
.territory-map__marker-core { fill: #fff; opacity: .42; }
.territory-map__marker text { fill: #fff; font-family: var(--font-label); font-size: 18px; font-weight: 700; text-anchor: middle; }

.territory-trace { width: min(330px, calc(100% - 48px)); position: absolute; z-index: 4; right: max(24px, calc((100vw - 1180px) / 2)); bottom: clamp(48px, 7vw, 92px); padding: 16px; border: 1px solid rgba(255,255,255,.25); color: #fff; background: rgba(0,57,82,.9); backdrop-filter: blur(3px); }
.territory-trace__label { display: block; margin-bottom: 12px; color: var(--agua); }
.territory-trace ol { margin: 0; padding: 0; display: grid; gap: 7px; list-style: none; }
.territory-trace__step { min-height: 48px; padding: 8px 0; display: grid; grid-template-columns: 30px 1fr; align-items: center; gap: 0 8px; border-top: 1px solid rgba(255,255,255,.17); }
.territory-trace__step > span { grid-row: 1 / span 2; color: var(--agua); font-family: var(--font-label); font-size: .68rem; }
.territory-trace__step strong { color: #fff; font-size: .88rem; }
.territory-trace__step small { color: rgba(255,255,255,.66); font-size: .72rem; line-height: 1.3; }

.why-angico { padding-block: clamp(76px, 10vw, 138px); }
.why-angico__heading { max-width: 840px; }
.section-label { color: var(--mata); }
.why-angico h2, .journey h2, .contact h2 { margin: 22px 0 24px; }
.why-angico__heading > p:last-child, .contact-heading > p:last-child { max-width: 62ch; font-size: clamp(1.05rem, 1.5vw, 1.2rem); line-height: 1.65; }
.why-angico__list { margin: clamp(48px, 7vw, 82px) 0 0; padding: 0; display: grid; grid-template-columns: repeat(3, 1fr); border-block: 1px solid color-mix(in srgb, var(--mata) 28%, transparent); list-style: none; }
.why-angico__list li { padding: 28px clamp(18px, 3vw, 36px) 30px 0; }
.why-angico__list li + li { padding-left: clamp(18px, 3vw, 36px); border-left: 1px solid color-mix(in srgb, var(--mata) 28%, transparent); }
.why-angico__list p { margin: 12px 0 0; line-height: 1.55; }
.why-angico__boundary { margin: 26px 0 0; padding-left: 16px; border-left: 3px solid var(--agua); color: var(--mata); font-weight: 600; }

.journey { padding-block: 0 clamp(76px, 10vw, 132px); }
.journey__heading { max-width: 760px; }
.journey__list { margin: clamp(42px, 6vw, 72px) 0 0; padding: 0; display: grid; grid-template-columns: repeat(4, 1fr); list-style: none; }
.journey__list li { min-height: 205px; padding: 24px 22px; border-top: 3px solid var(--agua); border-bottom: 1px solid color-mix(in srgb, var(--mata) 28%, transparent); }
.journey__list li + li { border-left: 1px solid color-mix(in srgb, var(--mata) 28%, transparent); }
.journey__list span { color: var(--mata); font-family: var(--font-label); font-size: .7rem; }
.journey__list h3 { margin-top: 38px; }
.journey__list p { margin: 12px 0 0; line-height: 1.5; }

.contact { padding-block: clamp(76px, 10vw, 136px); display: grid; grid-template-columns: minmax(0,.85fr) minmax(320px,.75fr); gap: clamp(50px,10vw,144px); border-top: 1px solid color-mix(in srgb, var(--mata) 24%, transparent); }
form { display: grid; gap: 20px; }
label { display: grid; gap: 8px; color: var(--mata); font-weight: 600; }
input, textarea { width: 100%; padding: 12px 14px; border: 1px solid var(--mata); border-radius: 0; background: transparent; }
textarea { resize: vertical; }
form button { justify-self: start; }
form button:disabled { border-color: color-mix(in srgb, var(--mata) 68%, var(--fibra)); background: color-mix(in srgb, var(--mata) 68%, var(--fibra)); cursor: wait; }
.form-feedback { max-width: 46ch; margin: -4px 0 0; color: var(--grafite); line-height: 1.5; }
.form-feedback-success, .form-feedback-error { color: var(--mata); }
.contact-unavailable { padding: 26px 0; border-block: 1px solid color-mix(in srgb, var(--mata) 28%, transparent); }
.contact-unavailable > p:nth-child(2) { max-width: 42ch; margin: 20px 0 14px; line-height: 1.6; }

.site-footer { min-height: 270px; position: relative; overflow: hidden; color: var(--fibra); background: var(--brand-deep); }
.site-footer a:focus-visible { outline-color: var(--fibra); }
.footer-leaf-stage { position: absolute; inset: 0; pointer-events: none; }
.footer-leaf { width: clamp(48px, 6vw, 78px); aspect-ratio: 1; position: absolute; right: clamp(28px, 10vw, 150px); bottom: 18px; opacity: .28; background: var(--agua); -webkit-mask: url('/angico-leaf-ink.png') center / contain no-repeat; mask: url('/angico-leaf-ink.png') center / contain no-repeat; transform: rotate(-18deg); }
.footer-inner { min-height: 270px; position: relative; z-index: 2; padding-block: 56px 44px; display: grid; grid-template-columns: 1fr auto auto; align-items: end; gap: 34px; color: var(--fibra); font-size: .9rem; }
.footer-wordmark { width: 126px; min-height: 44px; display: inline-flex; align-items: center; }
.footer-wordmark img { width: 126px; height: auto; display: block; }
.footer-inner p { margin: 0; }
.footer-inner > a:last-child { min-height: 44px; align-content: center; font-weight: 600; text-underline-offset: 5px; }

@keyframes map-base-reveal {
  from { opacity: 0; transform: scale(1.02); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes map-detail-reveal {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes trace-marker-reveal {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes trace-route-draw {
  from { stroke-dashoffset: 1; }
  to { stroke-dashoffset: 0; }
}
@keyframes leaf-fall {
  0% { opacity: 0; transform: translate3d(-24px,-330px,0) rotate(-24deg); }
  12% { opacity: .78; }
  48% { transform: translate3d(28px,-150px,0) rotate(116deg); }
  88% { opacity: .72; }
  100% { opacity: 0; transform: translate3d(-8px,90px,0) rotate(248deg); }
}

@media (prefers-reduced-motion: no-preference) {
  .territory-map__layer--base { opacity: 0; animation: map-base-reveal .8s ease-out forwards; }
  .territory-map__layer--details { opacity: 0; animation: map-detail-reveal 1s ease-out .8s forwards; }
  .territory-map__marker { opacity: 0; transform-box: fill-box; transform-origin: center; animation: trace-marker-reveal .8s ease-out forwards; }
  .territory-map__marker--observation { animation-delay: 1.8s; }
  .territory-map__marker--action { animation-delay: 2.6s; }
  .territory-map__marker--evidence { animation-delay: 3.4s; }
  .territory-map__marker--result { animation-delay: 4.2s; }
  .territory-map__route { stroke-dasharray: 1; stroke-dashoffset: 1; animation: trace-route-draw .8s ease-out forwards; }
  .territory-map__route--one { animation-delay: 2.6s; }
  .territory-map__route--two { animation-delay: 3.4s; }
  .territory-map__route--three { animation-delay: 4.2s; }
  .footer-leaf { top: -80px; bottom: auto; animation: leaf-fall 9s ease-in-out infinite; }
}

@media (max-width: 960px) {
  .territory-hero::after { background: linear-gradient(90deg, rgba(0,57,82,.94) 0%, rgba(0,57,82,.72) 58%, rgba(0,57,82,.25) 100%); }
  .territory-hero__copy { max-width: 540px; }
  .territory-trace { width: 290px; }
  .why-angico__list { grid-template-columns: 1fr; }
  .why-angico__list li + li { padding-left: 0; border-left: 0; border-top: 1px solid color-mix(in srgb, var(--mata) 28%, transparent); }
  .journey__list { grid-template-columns: repeat(2,1fr); }
  .contact { grid-template-columns: 1fr; }
}

@media (max-width: 720px) {
  .site-frame { width: min(100% - 32px,1180px); }
  .header-inner { min-height: auto; align-items: flex-start; padding-block: 16px; }
  .wordmark-image { width: 112px; height: 32px; }
  .site-header nav { max-width: 210px; flex-wrap: wrap; justify-content: flex-end; gap: 4px 12px; }
  .site-header nav a { font-size: .8rem; }
  .header-access { min-height: 34px; padding-inline: 10px; font-size: .75rem; }
  .header-access--unavailable { max-width: 130px; }

  .territory-hero { min-height: auto; display: flex; flex-direction: column; }
  .territory-hero::after { display: none; }
  .territory-hero__content { order: 1; width: min(100% - 32px,1180px); padding-block: 62px 52px; }
  .territory-hero__copy { max-width: none; }
  .territory-hero h1 { font-size: clamp(2.85rem,14vw,4.4rem); }
  .territory-hero__map { order: 2; min-height: 510px; position: relative; }
  .territory-map__canvas { position: absolute; }
  .territory-map__demo-label { top: 14px; right: 14px; left: 14px; text-align: center; }
  .territory-map__svg { min-width: 720px; transform: translateX(-28%); }
  .territory-trace { right: 16px; bottom: 16px; left: 16px; width: auto; }
  .territory-trace__step small { display: none; }

  .why-angico, .contact { padding-block: 72px; }
  .journey { padding-bottom: 72px; }
  .journey__list { grid-template-columns: 1fr; }
  .journey__list li { min-height: auto; }
  .journey__list li + li { border-left: 0; }
  .journey__list h3 { margin-top: 20px; }
  .primary-action { width: 100%; text-align: center; }

  .site-footer, .footer-inner { min-height: 300px; }
  .footer-inner { padding-block: 46px 34px; grid-template-columns: 1fr; gap: 10px; align-content: end; }
}

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after { scroll-behavior: auto !important; animation: none !important; transition-duration: .01ms !important; }
  .territory-map__layer, .territory-map__marker { opacity: 1; transform: none; }
  .territory-map__route { stroke-dasharray: 14 12; stroke-dashoffset: 0; }
  .footer-leaf { top: auto; bottom: 18px; opacity: .28; transform: rotate(-18deg); }
}
```

- [ ] **Step 4: Run focused unit and desktop browser tests**

Run:

```bash
npm test -- --run
npm run e2e -- --project=desktop
```

Expected: all unit tests pass; both desktop E2E tests pass; reduced motion reports `animation-name: none`, normal motion reports one-shot map animation and infinite leaf animation.

- [ ] **Step 5: Run CSS and bundle checks**

Run:

```bash
npm run lint
npm run typecheck
npm run build
npm run budget
```

Expected: lint and typecheck pass; production build succeeds; JavaScript remains ≤ 225,000 bytes and CSS remains ≤ 16,000 bytes.

- [ ] **Step 6: Commit the visual implementation**

```bash
git add apps/site/src/styles.css apps/site/e2e/site.spec.ts
git commit -m "style(site): animate the territory-led public entry"
```

---

### Task 7: Full Delivery Verification

**Files:**
- Verify only; no source file changes are expected.

**Interfaces:**
- Consumes: completed Tasks 1-6.
- Produces: fresh evidence that all site gates pass across every configured viewport.

- [ ] **Step 1: Run the complete site verification**

Run from `apps/site`:

```bash
npm run verify
```

Expected:
- ESLint passes with zero warnings.
- TypeScript passes.
- All Vitest tests pass.
- Bundle-budget unit tests pass.
- Both Playwright tests pass in `mobile-320`, `mobile-375`, `mobile-430`, and `desktop`.
- JavaScript and CSS remain inside the existing limits.

- [ ] **Step 2: Run the dependency audit**

Run:

```bash
npm audit --audit-level=high
```

Expected: exit 0 with no high or critical vulnerability introduced by the change.

- [ ] **Step 3: Verify the implementation boundary**

Run from the repository root:

```bash
git diff 6384fb2 --name-only
git status --short
```

Expected:
- Changed implementation files are confined to `apps/site` plus this plan document.
- Working tree is clean after the task commits.
- No file under `apps/app` or `apps/api` changed.

- [ ] **Step 4: Review the final commits**

Run:

```bash
git log --oneline --max-count=8
```

Expected commit sequence includes:

```text
style(site): animate the territory-led public entry
refactor(site): compose the map-led public journey
feat(site): add leaf footer structure
feat(site): explain the Angico difference concisely
feat(site): lead public entry with territory
feat(site): add demonstrative territory map
docs: plan animated public entry implementation
docs: define animated public entry redesign
```
