import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  retries: 0,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3000",
    viewport: { width: 1512, height: 1100 },
    reducedMotion: "reduce",
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? {
          launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE },
        }
      : {}),
    screenshot: "only-on-failure",
  },
});
