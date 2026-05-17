import { test as base, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { aiConfig } from "../config";
import type { APICapture } from "../types";

/** API path patterns to monitor. */
const MONITOR_PATTERNS = [
  /\/api\/products/,
  /\/api\/orders/,
  /\/products/,
  /\/orders/,
];

/**
 * Extended Playwright test fixture that intercepts and records API
 * request/response pairs during test execution.
 *
 * Usage in test files:
 *   import { test } from "../../ai/fixtures/api-monitor";
 *   // ...tests automatically have API monitoring enabled
 */
export const test = base.extend<{ apiMonitor: void }>({
  apiMonitor: [
    async ({ page }, use, testInfo) => {
      const captures: APICapture[] = [];

      // Listen for all responses matching our patterns
      page.on("response", async (response) => {
        const url = response.url();
        const matchesPattern = MONITOR_PATTERNS.some((p) => p.test(url));
        if (!matchesPattern) return;

        const request = response.request();
        let requestBody: unknown;
        let responseBody: unknown;

        try {
          const postData = request.postData();
          if (postData) {
            requestBody = JSON.parse(postData);
          }
        } catch {
          // Not JSON — ignore
        }

        try {
          responseBody = await response.json();
        } catch {
          // Not JSON — ignore
        }

        captures.push({
          testTitle: testInfo.title,
          method: request.method(),
          url,
          requestBody,
          status: response.status(),
          responseBody,
          timestamp: new Date().toISOString(),
        });
      });

      await use();

      // After test: append captures to api-captures.json
      if (captures.length > 0) {
        appendCaptures(captures);
      }
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";

function appendCaptures(newCaptures: APICapture[]): void {
  const capturesPath = aiConfig.paths.apiCaptures;
  const dir = path.dirname(capturesPath);
  fs.mkdirSync(dir, { recursive: true });

  let existing: APICapture[] = [];
  if (fs.existsSync(capturesPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(capturesPath, "utf-8"));
    } catch {
      existing = [];
    }
  }

  existing.push(...newCaptures);
  fs.writeFileSync(capturesPath, JSON.stringify(existing, null, 2));
}
