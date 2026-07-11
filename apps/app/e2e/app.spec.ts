import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { installApiFixtures } from './api-fixtures';

async function expectNoVisibleOverflow(page: Page) {
  const overflowingElements = await page.locator('body *').evaluateAll((elements) => elements.flatMap((element) => {
    const style = getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') return [];
    const rect = element.getBoundingClientRect();
    if (rect.left >= -0.5 && rect.right <= window.innerWidth + 0.5) return [];
    return [`${element.tagName.toLowerCase()}.${element.className}: ${rect.left}/${rect.right}`];
  }));
  expect(overflowingElements).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => window.innerWidth)
  );
}

async function expectNoSeriousAccessibilityViolations(page: Page) {
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(accessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical'))
    .toEqual([]);
}

test('supports keyboard login and a responsive authenticated shell', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  const unhandledRequests = await installApiFixtures(page);

  await page.goto('/login');

  await expect(page.getByRole('heading', { name: 'Acessar Angico' })).toBeVisible();
  await expectNoVisibleOverflow(page);
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  await expectNoSeriousAccessibilityViolations(page);

  await page.keyboard.press('Tab');
  await expect(page.getByLabel('E-mail')).toBeFocused();
  await page.keyboard.type('ana@example.org');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Senha')).toBeFocused();
  await page.keyboard.type('senha-local');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Entrar no território' })).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole('heading', { name: 'Território de verificação' })).toBeVisible();
  await expectNoVisibleOverflow(page);

  const viewport = page.viewportSize();
  const observationsLink = page.getByRole('link', { name: 'Observações' });
  if (viewport && viewport.width <= 900) {
    const menuButton = page.getByRole('button', { name: 'Abrir menu' });
    await menuButton.focus();
    await page.keyboard.press('Enter');
    await expect(observationsLink).toBeVisible();
    await page.getByRole('button', { name: 'Fechar menu' }).press('Enter');
  } else {
    await expect(observationsLink).toBeVisible();
  }

  await expectNoSeriousAccessibilityViolations(page);
  expect(unhandledRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test('rejects fixture requests with an unexpected identity or workspace', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  const violations = await installApiFixtures(page);
  await page.goto('/login');

  const statuses = await page.evaluate(async () => {
    const login = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'outra@example.org', password: 'incorreta' })
    });
    const dashboard = await fetch('/api/glimpse/dashboard?workspaceId=outro');
    return [login.status, dashboard.status];
  });

  expect(statuses).toEqual([422, 422]);
  expect(violations).toEqual([
    'POST /api/auth/login: corpo inesperado',
    'GET /api/glimpse/dashboard?workspaceId=outro: query inesperada'
  ]);
});
