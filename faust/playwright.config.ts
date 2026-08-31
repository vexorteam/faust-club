import { defineConfig, devices } from "@playwright/test"

/**
 * Smoke tests of the pair "Next + Python API".
 *
 * These are not a second unit suite: Vitest already covers schemas, the API
 * client and the session. What only a browser can answer is whether the two
 * applications still fit together — the showcase renders what the API stores,
 * the login form hands out a session, and an edit made in the admin reaches
 * the public menu.
 *
 * The API is a prerequisite, not something this config starts: it owns the
 * database and the photo volume, and a test runner has no business seeding or
 * wiping either. Start it first (`uv run uvicorn faust_api.main:app --port 8000`
 * from `api/`), then run the suite.
 */

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: BASE_URL,
    /** The full browser, not the headless shell: closer to what a visitor runs. */
    channel: "chromium",
    locale: "uk-UA",
    timezoneId: "Europe/Kyiv",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120000,
  },
})
