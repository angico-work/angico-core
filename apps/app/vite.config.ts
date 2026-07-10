import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const apiBaseUrl = env.VITE_API_BASE_URL || '';
  const proxyTarget = apiBaseUrl.startsWith('http')
    ? apiBaseUrl
    : 'http://localhost:8082';

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5176,
      strictPort: true,
      proxy: {
        '/api': { target: proxyTarget, changeOrigin: true },
        '/health': { target: proxyTarget, changeOrigin: true }
      }
    }
  };
});
