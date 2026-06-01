const { defineConfig, devices } = require('@playwright/test');
const path = require('path');

const root = __dirname;

const apiUrl = process.env.E2E_API_URL || 'http://127.0.0.1:8000';
const webUrl = process.env.E2E_BASE_URL || 'http://localhost:5173';

module.exports = defineConfig({
  testDir: path.join(root, 'e2e'),
  timeout: 240_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: path.join(root, 'e2e', 'global-setup.cjs'),
  use: {
    baseURL: webUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.E2E_SKIP_WEBSERVER
    ? undefined
    : [
        {
          command:
            'cd love_backend && . .venv/bin/activate && DJANGO_SETTINGS_MODULE=config.settings.dev python manage.py runserver 127.0.0.1:8000',
          url: `${apiUrl}/health/`,
          // Reuse only when explicitly requested; a stale `npm run dev` without
          // VITE_API_URL + /api proxy breaks session/CSRF and hangs on Approve.
          reuseExistingServer: process.env.E2E_REUSE_SERVERS === '1',
          timeout: 120_000,
          cwd: root,
        },
        {
          command:
            'cd love_frontend && VITE_API_URL=http://localhost:5173 npm run dev -- --host 127.0.0.1 --port 5173',
          url: webUrl,
          reuseExistingServer: process.env.E2E_REUSE_SERVERS === '1',
          timeout: 120_000,
          cwd: root,
        },
      ],
});
