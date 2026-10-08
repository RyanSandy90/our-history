import { defineConfig } from "@playwright/test";

const baseURL = "http://127.0.0.1:3100";
const executablePath = process.env.PLAYWRIGHT_CHROME_PATH;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    browserName: "chromium",
    viewport: { width: 1280, height: 832 },
    // The default is Playwright's bundled Chromium. A local Chrome installation
    // is useful for the separate headed GPU regression, but is never required.
    launchOptions: executablePath ? { executablePath } : {},
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --port 3100",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
