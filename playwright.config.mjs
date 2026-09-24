import {defineConfig, devices} from '@playwright/test'

const frontUrl = 'http://127.0.0.1:3417'
const browserTests = [
  'campaigns.spec.js',
  'meter-synchronization.spec.js',
  'counting-code.spec.js',
  'security-modernisation.spec.js',
  'selected-volume-totals.spec.js',
  'public-stats.spec.js',
  'dashboard-zone-selection.spec.js',
  'grouped-multiselect.spec.js',
  'chart-axes.spec.js',
  'declaration-charts.spec.js',
  'declaration-file-selection.spec.js',
  'point-water-body.spec.js',
  'admin-chart-labels.spec.js'
]
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
    {name: 'chromium', testMatch: browserTests, use: {...devices['Desktop Chrome']}},
    {name: 'webkit', testMatch: browserTests, use: {...devices['Desktop Safari']}},
    {name: 'mobile', testMatch: browserTests, use: {...devices['iPhone 13']}},
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
