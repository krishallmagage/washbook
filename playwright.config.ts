import { defineConfig, devices } from '@playwright/test'

/**
 * The base path is not decoration — PRD US-11.1 and the §24 checklist are
 * tested through a real browser under /washbook, including offline scenarios
 * via `context.setOffline(true)`. Getting baseURL wrong here would make every
 * spec silently test a 404.
 */
const isCI = process.env['CI'] !== undefined && process.env['CI'] !== ''
const PORT = Number(process.env['PORT'] ?? 3000)
// The trailing slash is load bearing. `new URL('api/health', base)` drops the
// last path segment when the base has no trailing slash, so `/washbook` would
// silently become `/api/health` and every request-context spec would 404.
const BASE_URL =
  process.env['E2E_BASE_URL'] ?? `http://127.0.0.1:${String(PORT)}/washbook/`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  // `workers` is omitted rather than set to undefined: `exactOptionalPropertyTypes`
  // treats an explicit undefined as a distinct value, and Playwright's type does
  // not accept it. Omitting lets Playwright pick its own default locally.
  ...(isCI ? { workers: 1 } : {}),
  reporter: isCI ? [['html'], ['github']] : [['list']],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      // NFR-05: Android Chrome is the primary target. The pilot supervisor's
      // actual handset is confirmed in A-19 and added here in Slice 12.
      name: 'android-chrome',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'desktop-chrome',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'pnpm build && pnpm start',
    // Readiness, not health. `/api/health` answers "is the database up" and
    // returns 503 when it is not — correct for Docker's HEALTHCHECK, wrong as a
    // readiness probe, because it would make every E2E run require a database
    // even for specs that do not touch one.
    url: BASE_URL,
    reuseExistingServer: !isCI,
    timeout: 180_000,
  },
})
