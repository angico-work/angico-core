import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const labels = {
  javascript: 'JavaScript',
  styles: 'CSS'
};

async function totalBytes(directory, extension) {
  const entries = await readdir(directory, { withFileTypes: true });
  let total = 0;
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      total += await totalBytes(path, extension);
    } else if (entry.isFile() && extname(entry.name) === extension) {
      total += (await stat(path)).size;
    }
  }
  return total;
}

export async function checkBundleBudget(assetsDirectory, limits) {
  const totals = {
    javascript: await totalBytes(assetsDirectory, '.js'),
    styles: await totalBytes(assetsDirectory, '.css')
  };
  const exceeded = Object.entries(totals)
    .filter(([key, actual]) => actual > limits[key])
    .map(([key, actual]) => `${labels[key]}: ${actual} bytes, limite ${limits[key]} bytes`);
  if (exceeded.length) {
    throw new Error(`Orçamento de bundle excedido. ${exceeded.join('; ')}`);
  }
  return Object.fromEntries(Object.entries(totals).map(([key, actual]) => [
    key,
    { actual, limit: limits[key] }
  ]));
}

async function main() {
  const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const config = JSON.parse(await readFile(join(projectRoot, 'bundle-budget.json'), 'utf8'));
  const result = await checkBundleBudget(resolve(projectRoot, config.assetsDirectory), config.limits);
  for (const [key, values] of Object.entries(result)) {
    console.log(`${labels[key]}: ${values.actual}/${values.limit} bytes`);
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
