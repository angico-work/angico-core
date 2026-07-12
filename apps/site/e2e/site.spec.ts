import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('keeps the public journey responsive, sourced, keyboard-accessible and quiet', async ({ page, baseURL }) => {
  const errors: string[] = [];
  const unexpectedRequestUrls: string[] = [];
  if (!baseURL) throw new Error('Expected the Playwright base URL.');
  const allowedRequestOrigins = new Set([new URL(baseURL).origin]);
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
          rect.right > footer.left &&
          rect.left < footer.right &&
          rect.bottom > footer.top &&
          rect.top < footer.bottom
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
  ).toBeGreaterThanOrEqual(3);
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

  await expect(page.locator('.a-svg')).toHaveAttribute('preserveAspectRatio', 'xMidYMid meet');
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
        hero.querySelectorAll<SVGGraphicsElement>('.a-svg [data-layer], .a-marker, .a-route')
      ).map((element) => {
        const { top, right, bottom, left, width, height } = element.getBoundingClientRect();
        return {
          top,
          right,
          bottom,
          left,
          width,
          height,
          label:
            element.getAttribute('data-layer') ??
            element.getAttribute('class') ??
            'grid-axis'
        };
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
    first.left < second.right &&
    first.right > second.left &&
    first.top < second.bottom &&
    first.bottom > second.top;
  expect(intersects(geometry.label, geometry.north)).toBe(false);
  expect(intersects(geometry.gridLabel, geometry.scale)).toBe(false);
  for (const essential of geometry.essentials) {
    expect(essential.width, `${essential.label} width`).toBeGreaterThan(0);
    expect(essential.height, `${essential.label} height`).toBeGreaterThan(0);
    expect(essential.left, `${essential.label} left`).toBeGreaterThanOrEqual(
      geometry.plate.left - .5
    );
    expect(essential.right, `${essential.label} right`).toBeLessThanOrEqual(
      geometry.plate.right + .5
    );
    expect(essential.top, `${essential.label} top`).toBeGreaterThanOrEqual(
      geometry.plate.top - .5
    );
    expect(essential.bottom, `${essential.label} bottom`).toBeLessThanOrEqual(
      geometry.plate.bottom + .5
    );
  }

  if (testInfo.project.name === 'desktop-short') {
    expect(geometry.cta.bottom).toBeLessThanOrEqual(geometry.viewport.height);
    expect(geometry.trace.bottom).toBeLessThanOrEqual(geometry.viewport.height);
  }
});

test('keeps mobile atlas marginalia legible at 200 percent text zoom', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-320');
  await page.goto('/');
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });

  const result = await page.locator('.atlas').evaluate((atlas) => {
    const rect = (selector: string) => {
      const element = atlas.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      const { top, right, bottom, left } = element.getBoundingClientRect();
      return { top, right, bottom, left };
    };
    const intersects = (first: ReturnType<typeof rect>, second: ReturnType<typeof rect>) =>
      first.left < second.right &&
      first.right > second.left &&
      first.top < second.bottom &&
      first.bottom > second.top;
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
      ).some(
        (element) =>
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

test('sweeps complete atlas geometry from 320 through 1538 pixels', async ({ context }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-short');
  test.setTimeout(120_000);

  const stepped = Array.from(
    { length: Math.floor((1538 - 320) / 32) + 1 },
    (_, index) => 320 + index * 32
  );
  const widths = [
    ...new Set([
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
    ])
  ].sort((a, b) => a - b);

  for (const width of widths) {
    const probe = await context.newPage();
    const height =
      width <= 430
        ? 932
        : width <= 720
          ? 900
          : width < 1100
            ? 1024
            : width === 1538
              ? 789
              : 1000;
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
      const desktopOrder = copy.right <= atlas.left + .5;
      const stackedOrder = copy.bottom <= atlas.top + .5;
      const intersects = (first: ReturnType<typeof rect>, second: ReturnType<typeof rect>) =>
        first.left < second.right &&
        first.right > second.left &&
        first.top < second.bottom &&
        first.bottom > second.top;
      return {
        ordered: window.innerWidth >= 1100 ? desktopOrder : stackedOrder,
        svgContained:
          svg.left >= plate.left - .5 &&
          svg.right <= plate.right + .5 &&
          svg.top >= plate.top - .5 &&
          svg.bottom <= plate.bottom + .5,
        railsOrdered: plate.bottom <= legend.top + .5 && legend.bottom <= trace.top + .5,
        railsContained:
          legend.left >= atlas.left - .5 &&
          legend.right <= atlas.right + .5 &&
          trace.left >= atlas.left - .5 &&
          trace.right <= atlas.right + .5,
        marginaliaClear: !intersects(label, north) && !intersects(gridLabel, scale),
        shortDesktopContained:
          window.innerWidth !== 1538 ||
          (cta.bottom <= window.innerHeight + .5 && trace.bottom <= window.innerHeight + .5),
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
