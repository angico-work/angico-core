import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// API target for the dev proxy. The Angico API runs on 8082 (see apps/api).
const API_TARGET = process.env.ANGICO_API_URL ?? 'http://localhost:8082';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5175,
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true },
      '/health': { target: API_TARGET, changeOrigin: true }
    }
  }
});
