import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

type Rectangle = { top: number; right: number; bottom: number; left: number };

const rectanglesIntersect = (first: Rectangle, second: Rectangle) =>
  first.left < second.right &&
  first.right > second.left &&
  first.top < second.bottom &&
  first.bottom > second.top;

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

test('keeps all route markers clear of visible copy and trace', async ({ page }, testInfo) => {
  await page.goto('/');

  const markers = page.locator('.territory-map__marker');
  await expect(markers).toHaveCount(4);
  for (let index = 0; index < 4; index += 1) await expect(markers.nth(index)).toBeVisible();

  const obstacles = await page.locator('.territory-hero').evaluate((hero) => {
    const toRectangle = (rect: DOMRect) => {
      const { top, right, bottom, left } = rect;
      return { top, right, bottom, left };
    };
    const copy = hero.querySelector<HTMLElement>('.territory-hero__copy');
    const trace = hero.querySelector<HTMLElement>('.territory-trace');
    const demoLabel = hero.querySelector<HTMLElement>('.territory-map__demo-label');
    const map = hero.querySelector<SVGElement>('.territory-map__svg');
    if (!copy || !trace || !demoLabel || !map) {
      throw new Error('Expected hero copy, trace, demonstration label, and map.');
    }

    const copyRects = Array.from(copy.children).flatMap((element) => {
      const styles = getComputedStyle(element);
      if (styles.display === 'none' || styles.visibility === 'hidden') return [];
      if (element.matches('a, button')) {
        return [{ ...toRectangle(element.getBoundingClientRect()), label: element.tagName.toLowerCase() }];
      }
      const range = document.createRange();
      range.selectNodeContents(element);
      return Array.from(range.getClientRects())
        .filter(({ width, height }) => width > 0 && height > 0)
        .map((rect, index) => ({
          ...toRectangle(rect),
          label: element.tagName.toLowerCase() + '-line-' + String(index + 1)
        }));
    });
    return {
      copyRects,
      traceRect: { ...toRectangle(trace.getBoundingClientRect()), label: 'trace' },
      demoLabelRect: { ...toRectangle(demoLabel.getBoundingClientRect()), label: 'demo-label' },
      mapRect: toRectangle(map.getBoundingClientRect()),
      viewport: { width: window.innerWidth, height: window.innerHeight }
    };
  });
  const markerRects = await markers.evaluateAll((markerElements) =>
    markerElements.map((marker) => {
      const { top, right, bottom, left, width, height } = marker.getBoundingClientRect();
      return { top, right, bottom, left, width, height, label: marker.getAttribute('class') ?? 'marker' };
    })
  );

  expect(obstacles.copyRects.length).toBeGreaterThan(0);
  expect(markerRects).toHaveLength(4);
  for (const markerRect of markerRects) {
    expect(markerRect.width).toBeGreaterThan(0);
    expect(markerRect.height).toBeGreaterThan(0);
    expect(markerRect.left).toBeGreaterThanOrEqual(0);
    expect(markerRect.right).toBeLessThanOrEqual(obstacles.viewport.width);
    expect(markerRect.top).toBeGreaterThanOrEqual(0);
    expect(markerRect.bottom).toBeLessThanOrEqual(obstacles.viewport.height);
    for (const obstacle of [
      ...obstacles.copyRects,
      obstacles.traceRect,
      obstacles.demoLabelRect
    ]) {
      expect(
        rectanglesIntersect(markerRect, obstacle),
        markerRect.label + ' intersects ' + obstacle.label
      ).toBe(false);
    }
  }
  if (testInfo.project.name.startsWith('mobile-') || testInfo.project.name === 'boundary-720') {
    expect(obstacles.traceRect.top).toBeGreaterThanOrEqual(obstacles.mapRect.bottom);
  }
});

test('keeps mid-width hero copy and trace in separate regions', async ({ page }, testInfo) => {
  test.skip(!['tablet-768', 'tablet-834', 'desktop-1024'].includes(testInfo.project.name));
  await page.goto('/');

  const heroCopy = await page.locator('.territory-hero__copy').evaluate((copy) => {
    const { top, right, bottom, left } = copy.getBoundingClientRect();
    return { top, right, bottom, left };
  });
  const trace = await page.locator('.territory-trace').evaluate((element) => {
    const { top, right, bottom, left } = element.getBoundingClientRect();
    return { top, right, bottom, left };
  });
  expect(rectanglesIntersect(heroCopy, trace)).toBe(false);
  expect(heroCopy.right).toBeLessThanOrEqual(trace.left);
});
