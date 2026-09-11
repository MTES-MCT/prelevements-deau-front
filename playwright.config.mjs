import {defineConfig, devices} from '@playwright/test'

const frontUrl = 'http://127.0.0.1:3417'
export default defineConfig({
  testDir: './tests/browser',
  outputDir: '.artifacts/browser-results',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 2,
  timeout: 45_000,
  reporter: [['list'], ['html', {outputFolder: '.artifacts/browser-report', open: 'never'}]],
  use: {
    baseURL: frontUrl,
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    {name: 'chromium', testMatch: 'security-modernisation.spec.js', use: {...devices['Desktop Chrome']}},
    {name: 'webkit', testMatch: 'security-modernisation.spec.js', use: {...devices['Desktop Safari']}},
    {name: 'mobile', testMatch: 'security-modernisation.spec.js', use: {...devices['iPhone 13']}},
    {
      name: 'large-spreadsheet',
      testMatch: 'spreadsheet-load.spec.js',
      dependencies: ['chromium', 'webkit', 'mobile']
    }
  ],
  webServer: [
    {
      command: 'node .github/scripts/browser-fixtures.mjs',
      url: 'http://127.0.0.1:3431/health',
      reuseExistingServer: false
    },
    {
      command: 'node .github/scripts/start-browser-front.mjs',
      url: frontUrl + '/healthz',
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        NODE_ENV: 'production',
        NODE_OPTIONS: '--max-old-space-size=512',
        PORT: '3417',
        HOSTNAME: '127.0.0.1',
        API_URL: 'http://127.0.0.1:3431',
        NEXTAUTH_URL: frontUrl,
        FRONT_URL: frontUrl,
        NEXTAUTH_SECRET: 'browser-tests-only-never-a-real-secret',
        AUDIT_CONTEXT_SECRET: 'browser-tests-only-audit-context-secret',
        NEXT_TELEMETRY_DISABLED: '1',
        NEXT_PUBLIC_CRISP_DISABLED: 'true',
        SENTRY_DSN: ''
      }
    }
  ]
})
