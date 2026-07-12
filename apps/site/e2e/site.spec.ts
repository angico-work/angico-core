import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('keeps the public journey responsive, keyboard-accessible and quiet', async ({ page, baseURL }) => {
  const errors: string[] = [];
  const unexpectedRequestUrls: string[] = [];
  if (!baseURL) throw new Error('Expected the Playwright base URL.');
  const allowedRequestOrigins = new Set([new URL(baseURL).origin]);

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
  await expect(page.getByRole('link', { name: 'Já sou membro' })).toHaveAttribute(
    'href',
    'http://127.0.0.1:4176/login'
  );
  await expect(
    page.getByRole('link', { name: 'Quero levar o Angico ao meu território' })
  ).toHaveAttribute('href', '#contato');
  await expect(page.getByText('Atlas demonstrativo — sem dados operacionais')).toBeVisible();

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
  await expect(page.locator('.leaf').first()).toHaveCSS('animation-name', 'none');
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

test('plays the atlas once and loops the leaf field when motion is allowed', async ({ page }) => {
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
  const firstLeaf = page.locator('.leaf').first();
  await expect(firstLeaf).toHaveCSS('animation-name', 'leaf-field-fall');
  await expect(firstLeaf).toHaveCSS('animation-duration', '8.6s');
  await expect(firstLeaf).toHaveCSS('animation-iteration-count', 'infinite');
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
