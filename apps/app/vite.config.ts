import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const proxyTarget = env.VITE_DEV_API_PROXY_TARGET || 'http://localhost:8082';

  return {
    plugins: [react()],
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
