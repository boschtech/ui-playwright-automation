import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import type { TestCase, TestResult } from "@playwright/test/reporter";
import AIReporter from "../../reporters/ai-reporter";

describe("AIReporter", () => {
  let reporter: AIReporter;

  beforeEach(() => {
    reporter = new AIReporter();
    vi.spyOn(fs, "mkdirSync").mockReturnValue(undefined);
    vi.spyOn(fs, "writeFileSync").mockReturnValue(undefined);
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  function makeTestCase(overrides: Partial<TestCase> = {}): TestCase {
    return {
      id: "test-abc",
      title: "should work",
      location: { file: "/project/e2e/tests/products.spec.ts", line: 10, column: 5 },
      parent: { title: "Products @product-service" },
      ...overrides,
    } as unknown as TestCase;
  }

  function makeTestResult(overrides: Partial<TestResult> = {}): TestResult {
    return {
      status: "passed" as const,
      duration: 1500,
      retry: 0,
      errors: [],
      attachments: [],
      ...overrides,
    } as unknown as TestResult;
  }

  it("records passed tests", () => {
    reporter.onBegin({} as any, {} as any);
    reporter.onTestEnd(makeTestCase(), makeTestResult());
    reporter.onEnd({} as any);

    const writeCall = (fs.writeFileSync as ReturnType<typeof vi.fn>).mock.calls;
    // Should write last-failures.json and test-history.json
    expect(writeCall.length).toBe(2);

    // Failures file should have empty array (no failures)
    const failuresContent = JSON.parse(writeCall[0][1] as string);
    expect(failuresContent).toEqual([]);

    // History should have one run with one passed test
    const historyContent = JSON.parse(writeCall[1][1] as string);
    expect(historyContent).toHaveLength(1);
    expect(historyContent[0].results).toHaveLength(1);
    expect(historyContent[0].results[0].status).toBe("passed");
  });

  it("records failed tests with error details", () => {
    reporter.onBegin({} as any, {} as any);

    reporter.onTestEnd(
      makeTestCase({ id: "test-fail" }),
      makeTestResult({
        status: "failed",
        duration: 5000,
        errors: [{ message: "Element not found" }],
        attachments: [
          { name: "screenshot", contentType: "image/png", path: "/tmp/shot.png" },
          { name: "trace", contentType: "application/zip", path: "/tmp/trace.zip" },
        ],
      })
    );

    reporter.onEnd({} as any);

    const writeCall = (fs.writeFileSync as ReturnType<typeof vi.fn>).mock.calls;
    const failuresContent = JSON.parse(writeCall[0][1] as string);

    expect(failuresContent).toHaveLength(1);
    expect(failuresContent[0].status).toBe("failed");
    expect(failuresContent[0].error).toBe("Element not found");
    expect(failuresContent[0].screenshotPath).toBe("/tmp/shot.png");
    expect(failuresContent[0].tracePath).toBe("/tmp/trace.zip");
  });

  it("appends to existing history", () => {
    const existingHistory = [
      { runId: "old-run", timestamp: "2026-01-01", results: [] },
    ];
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readFileSync").mockReturnValue(
      JSON.stringify(existingHistory)
    );

    reporter.onBegin({} as any, {} as any);
    reporter.onTestEnd(makeTestCase(), makeTestResult());
    reporter.onEnd({} as any);

    const writeCall = (fs.writeFileSync as ReturnType<typeof vi.fn>).mock.calls;
    const historyContent = JSON.parse(writeCall[1][1] as string);

    // Should have old run + new run
    expect(historyContent).toHaveLength(2);
    expect(historyContent[0].runId).toBe("old-run");
  });

  it("separates passed and failed in counts", () => {
    reporter.onBegin({} as any, {} as any);

    reporter.onTestEnd(
      makeTestCase({ id: "t1", title: "passes" }),
      makeTestResult({ status: "passed" })
    );
    reporter.onTestEnd(
      makeTestCase({ id: "t2", title: "fails" }),
      makeTestResult({
        status: "failed",
        errors: [{ message: "fail" }],
        attachments: [],
      })
    );
    reporter.onTestEnd(
      makeTestCase({ id: "t3", title: "passes too" }),
      makeTestResult({ status: "passed" })
    );

    reporter.onEnd({} as any);

    const logCalls = (console.log as ReturnType<typeof vi.fn>).mock.calls;
    const summaryLog = logCalls.find((c) =>
      String(c[0]).includes("complete")
    );
    expect(summaryLog).toBeDefined();
    expect(String(summaryLog![0])).toContain("2 passed");
    expect(String(summaryLog![0])).toContain("1 failed");
  });

  it("handles timedOut status as a failure", () => {
    reporter.onBegin({} as any, {} as any);
    reporter.onTestEnd(
      makeTestCase({ id: "t-timeout" }),
      makeTestResult({
        status: "timedOut",
        errors: [{ message: "Timeout 30s exceeded" }],
        attachments: [],
      })
    );
    reporter.onEnd({} as any);

    const writeCall = (fs.writeFileSync as ReturnType<typeof vi.fn>).mock.calls;
    const failuresContent = JSON.parse(writeCall[0][1] as string);

    expect(failuresContent).toHaveLength(1);
    expect(failuresContent[0].status).toBe("timedOut");
    expect(failuresContent[0].error).toContain("Timeout");
  });
});
