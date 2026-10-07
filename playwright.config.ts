import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', fullyParallel: false, workers: 1,
  timeout: 180000, expect: { timeout: 15000 },
  use: { baseURL: process.env.TEST_BASE_URL || 'http://127.0.0.1:3000', headless: true, actionTimeout: 15000, launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] } : undefined, trace: 'retain-on-failure' },
  reporter: 'list',
  webServer: process.env.CI ? { command: 'npm run dev -- --hostname 127.0.0.1 --port 3000', url: 'http://127.0.0.1:3000/login', reuseExistingServer: false, timeout: 60000 } : undefined,
});
