import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkBundleBudget } from './check-bundle-budget.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('covers the top-level service worker in the configured bundle scope', async () => {
  const config = JSON.parse(await readFile(join(projectRoot, 'bundle-budget.json'), 'utf8'));
  const scope = resolve(projectRoot, config.assetsDirectory);
  const serviceWorker = resolve(projectRoot, 'dist/sw.js');
  const pathFromScope = relative(scope, serviceWorker);

  assert.equal(pathFromScope === '..' || pathFromScope.startsWith(`..${sep}`), false);
});

test('reports JavaScript and CSS totals within the configured limits', async () => {
  const root = await mkdtemp(join(tmpdir(), 'angico-budget-'));
  const assets = join(root, 'assets');
  await mkdir(assets);
  await writeFile(join(assets, 'entry.js'), '12345');
  await writeFile(join(assets, 'route.js'), '123');
  await writeFile(join(assets, 'styles.css'), '1234');
  await writeFile(join(assets, 'font.woff2'), 'ignored');

  const result = await checkBundleBudget(assets, { javascript: 10, styles: 5 });

  assert.deepEqual(result, {
    javascript: { actual: 8, limit: 10 },
    styles: { actual: 4, limit: 5 }
  });
});

test('fails when a bundle total exceeds its limit', async () => {
  const root = await mkdtemp(join(tmpdir(), 'angico-budget-'));
  await writeFile(join(root, 'entry.js'), '123456');

  await assert.rejects(
    () => checkBundleBudget(root, { javascript: 5, styles: 0 }),
    /JavaScript: 6 bytes, limite 5 bytes/
  );
});
