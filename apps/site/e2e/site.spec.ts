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
  await expect(page.locator('.footer-leaf')).toHaveCSS('animation-name', 'none');
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

test('plays the map once and loops only the leaf when motion is allowed', async ({ page }) => {
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
  await expect(page.locator('.footer-leaf')).toHaveCSS('animation-name', 'leaf-fall');
  await expect(page.locator('.footer-leaf')).toHaveCSS('animation-duration', '9s');
  await expect(page.locator('.footer-leaf')).toHaveCSS('animation-iteration-count', 'infinite');
});

test('keeps the animated leaf below the footer before restarting', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');

  const geometry = await page.locator('.footer-leaf').evaluate(async (leaf) => {
    const animation = leaf.getAnimations()[0];
    if (!animation) throw new Error('Expected the footer leaf animation to exist.');
    animation.pause();
    animation.currentTime = 8_990;
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    const leafRect = leaf.getBoundingClientRect();
    const footerRect = leaf.closest('footer')?.getBoundingClientRect();
    if (!footerRect) throw new Error('Expected the footer leaf to be inside a footer.');
    return { leafTop: leafRect.top, footerBottom: footerRect.bottom };
  });

  expect(geometry.leafTop).toBeGreaterThanOrEqual(geometry.footerBottom);
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
