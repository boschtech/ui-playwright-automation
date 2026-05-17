import type {
  TestRecord,
  RunHistory,
  RCAResult,
  APICapture,
} from "../types";

/* ── Test record factories ── */

export function makeTestRecord(
  overrides: Partial<TestRecord> = {}
): TestRecord {
  return {
    testId: "test-1",
    title: "should display products",
    file: "e2e/tests/products.spec.ts",
    suite: "Products @product-service",
    status: "passed",
    duration: 1200,
    retries: 0,
    timestamp: "2026-05-17T10:00:00Z",
    ...overrides,
  };
}

export function makeFailedRecord(
  overrides: Partial<TestRecord> = {}
): TestRecord {
  return makeTestRecord({
    status: "failed",
    error: "expect(locator).toBeVisible() — element not found",
    screenshotPath: "/tmp/screenshot.png",
    ...overrides,
  });
}

export function makeRunHistory(
  overrides: Partial<RunHistory> & { results?: TestRecord[] } = {}
): RunHistory {
  return {
    runId: "run-1",
    timestamp: "2026-05-17T10:00:00Z",
    commit: "abc123",
    branch: "main",
    results: [makeTestRecord()],
    ...overrides,
  };
}

export function makeRCAResult(
  overrides: Partial<RCAResult> = {}
): RCAResult {
  return {
    testId: "test-1",
    title: "should display products",
    file: "e2e/tests/products.spec.ts",
    category: "BUG",
    rootCause: "Product API returns 500",
    suggestedFix: "Fix the /api/products endpoint",
    confidence: 0.9,
    ...overrides,
  };
}

export function makeAPICapture(
  overrides: Partial<APICapture> = {}
): APICapture {
  return {
    testTitle: "should display products",
    method: "GET",
    url: "http://localhost:8080/api/products",
    status: 200,
    responseBody: { id: 1, name: "Widget", price: 9.99 },
    timestamp: "2026-05-17T10:00:00Z",
    ...overrides,
  };
}
