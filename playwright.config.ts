import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  outputDir: "work/playwright-results",
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:3011",
    headless: true,
    reducedMotion: "reduce",
    viewport: { width: 1440, height: 1000 },
    timezoneId: "America/Hermosillo",
    locale: "es-MX",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {},
  },
  webServer: {
    command: "npm run start",
    url: "http://127.0.0.1:3011/api/health",
    reuseExistingServer: false,
    env: { PORT: "3011", DB_NAME: "vetsync_test" },
    timeout: 30000,
  },
});
