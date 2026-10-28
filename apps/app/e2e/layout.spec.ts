import { expect, test } from '@playwright/test';
import { findVisibleOverflow } from './layout';

test('distinguishes clipped map content from visible layout overflow', async ({ page }) => {
  await page.setContent(`
    <style>body { margin: 0; }</style>
    <div id="map" style="position: relative; width: 100%; height: 200px; overflow: hidden;">
      <div style="position: absolute; left: -200px; width: 200vw; height: 200px;">tile</div>
      <div style="position: absolute; left: 200vw; width: 0; height: 0;"></div>
    </div>
  `);
  expect(await page.locator('body *').evaluateAll(findVisibleOverflow)).toEqual([]);

  // Removing clipping must expose the oversized tile to the assertion.
  await page.locator('#map').evaluate((element) => { element.style.overflow = 'visible'; });
  expect(await page.locator('body *').evaluateAll(findVisibleOverflow)).toHaveLength(1);

  // Clipping children must not conceal an oversized map container itself.
  await page.locator('#map').evaluate((element) => {
    element.style.overflow = 'hidden';
    element.style.width = '150vw';
  });
  expect(await page.locator('body *').evaluateAll(findVisibleOverflow)).not.toEqual([]);
});
