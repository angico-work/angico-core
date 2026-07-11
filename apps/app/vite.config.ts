import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadEnv } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { computeBuildRevision } from './buildRevision';

function revisionServiceWorker(): Plugin {
  return {
    name: 'revision-service-worker',
    apply: 'build',
    async closeBundle() {
      const output = resolve(process.cwd(), 'dist');
      const serviceWorkerPath = resolve(output, 'sw.js');
      const serviceWorker = await readFile(serviceWorkerPath, 'utf8');
      const placeholder = '__ANGICO_BUILD_REVISION__';
      if (!serviceWorker.includes(placeholder)) {
        throw new Error('O service worker não contém o marcador de revisão.');
      }
      const names = [
        'asset-manifest.json',
        'sw.js',
        'index.html',
        'manifest.webmanifest',
        'angico-icone.png'
      ];
      const revision = computeBuildRevision(await Promise.all(names.map(async (name) => ({
        name,
        content: await readFile(resolve(output, name))
      }))));
      await writeFile(serviceWorkerPath, serviceWorker.replaceAll(placeholder, revision));
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const proxyTarget = env.VITE_DEV_API_PROXY_TARGET || 'http://localhost:8082';

  return {
    plugins: [react(), revisionServiceWorker()],
    build: {
      manifest: 'asset-manifest.json'
    },
    server: {
      host: '0.0.0.0',
      port: 5176,
      strictPort: true,
      proxy: {
        '/api': { target: proxyTarget, changeOrigin: true },
        '/health': { target: proxyTarget, changeOrigin: true }
      }
    },
    test: {
      environment: 'jsdom'
    }
  };
});
