import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('keeps the public journey responsive, keyboard-accessible and quiet', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/api/contact', async (route) => {
    expect(route.request().method()).toBe('POST');
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"accepted":true}' });
  });

  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toContainText('A ação acontece hoje.');
  await expect(page.getByRole('link', { name: 'Entrar no aplicativo' })).toHaveAttribute(
    'href',
    'http://127.0.0.1:4176/login'
  );
  const overflowingElements = await page.locator('body *').evaluateAll((elements) => elements.flatMap((element) => {
    const rect = element.getBoundingClientRect();
    if (rect.left >= -0.5 && rect.right <= window.innerWidth + 0.5) return [];
    return [`${element.tagName.toLowerCase()}.${element.className}: ${rect.left}/${rect.right}`];
  }));
  expect(overflowingElements).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => window.innerWidth)
  );
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');

  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Ir para o conteúdo' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#conteudo$/);

  await page.getByRole('link', { name: 'Percorrer o rastro' }).click();
  await expect(page).toHaveURL(/#rastro$/);

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
  expect(errors).toEqual([]);
});
