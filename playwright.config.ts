import { defineConfig, devices } from "@playwright/test";

const baseURL =
  process.env.E2E_BASE_URL ?? "https://micro-frontend-vm5b.onrender.com";

export default defineConfig({
  testDir: "./e2e/tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // The suite runs against a shared, free-tier deployment that occasionally
  // returns transient 5xx/empty responses under parallel load. Retry once
  // locally (and twice in CI) so a single backend hiccup doesn't fail a run.
  retries: process.env.CI ? 2 : 1,
  // The free-tier deployment can't sustain the default local worker count
  // (~half the CPU cores), which causes transient 5xx/empty responses and
  // dropped writes. Cap local concurrency to a level the shared backend can
  // handle; CI talks to a dedicated deployment and keeps full parallelism.
  workers: process.env.CI ? 10 : 3,
  reporter: process.env.CI
    ? [["html", { open: "never" }], ["github"], ["./ai/reporters/ai-reporter.ts"]]
    : [["html", { open: "on-failure" }], ["./ai/reporters/ai-reporter.ts"]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // Record every test and keep the video only when the test fails. This
    // makes post-mortem debugging from the published report much easier.
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
