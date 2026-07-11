import { defineConfig } from '@playwright/test';

const viewports = [
  { name: 'mobile-320', width: 320, height: 800 },
  { name: 'mobile-375', width: 375, height: 812 },
  { name: 'mobile-430', width: 430, height: 932 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'tablet-834', width: 834, height: 1112 },
  { name: 'desktop-1024', width: 1024, height: 1024 },
  { name: 'desktop', width: 1440, height: 1000 }
];

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'line',
  outputDir: 'test-results',
  use: {
    baseURL: 'http://127.0.0.1:4175',
    browserName: 'chromium',
    contextOptions: { reducedMotion: 'reduce' },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  projects: viewports.map(({ name, width, height }) => ({
    name,
    use: { viewport: { width, height } }
  })),
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1',
    env: {
      VITE_APP_URL: 'http://127.0.0.1:4176/login',
      VITE_CONTACT_API_URL: '/api/contact'
    },
    url: 'http://127.0.0.1:4175',
    reuseExistingServer: false,
    timeout: 120_000
  }
});
