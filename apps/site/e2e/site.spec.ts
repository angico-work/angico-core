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
