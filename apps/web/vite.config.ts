import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Dev-only proxy: in development the web app calls /api on the same origin and
// Vite forwards it to the Angico API (port 8082). Override the target with
// VITE_DEV_API_PROXY_TARGET (or ANGICO_API_URL). In production the app talks to
// VITE_API_BASE_URL directly, so this proxy is not used.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget =
    env.VITE_DEV_API_PROXY_TARGET || env.ANGICO_API_URL || 'http://localhost:8082';

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5175,
      proxy: {
        '/api': { target: proxyTarget, changeOrigin: true },
        '/health': { target: proxyTarget, changeOrigin: true }
      }
    }
  };
});
