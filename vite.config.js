import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_DEV_API_PROXY_TARGET || 'http://localhost:8082';

  return {
  server: {
    host: '0.0.0.0',
    port: 5175,
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true
      },
      '/health': {
        target: proxyTarget,
        changeOrigin: true
      }
    }
  }
  };
});
