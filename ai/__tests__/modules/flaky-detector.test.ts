import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import { makeTestRecord, makeRunHistory } from "../helpers";

// Mock the Claude client so detectFlakyTests never calls the real API
vi.mock("../../client", () => ({
  askJSON: vi.fn(),
}));

describe("flaky-detector", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty array when history file does not exist", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    const { detectFlakyTests } = await import("../../modules/flaky-detector");
    const result = await detectFlakyTests();
    expect(result).toEqual([]);
  });

  it("returns empty array when fewer than 3 runs in history", async () => {
    const history = [makeRunHistory(), makeRunHistory({ runId: "run-2" })];
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readFileSync").mockReturnValue(JSON.stringify(history));

    const { detectFlakyTests } = await import("../../modules/flaky-detector");
    const result = await detectFlakyTests();
    expect(result).toEqual([]);
  });

  it("identifies flaky candidates with < 100% pass rate", async () => {
    const runs = [
      makeRunHistory({
        runId: "r1",
        results: [
          makeTestRecord({ testId: "t1", status: "passed", duration: 1000 }),
        ],
      }),
      makeRunHistory({
        runId: "r2",
        results: [
          makeTestRecord({ testId: "t1", status: "failed", duration: 1100 }),
        ],
      }),
      makeRunHistory({
        runId: "r3",
        results: [
          makeTestRecord({ testId: "t1", status: "passed", duration: 1050 }),
        ],
      }),
    ];

    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readFileSync").mockReturnValue(JSON.stringify(runs));

    const mockAskJSON = vi.fn().mockResolvedValue([
      {
        testId: "t1",
        title: "should display products",
        file: "e2e/tests/products.spec.ts",
        passRate: 0.67,
        totalRuns: 3,
        avgDuration: 1050,
        durationVariance: 50,
        classification: "timing-dependent",
        recommendation: "Add explicit wait",
      },
    ]);
    const clientMod = await import("../../client");
    (clientMod.askJSON as any) = mockAskJSON;

    vi.resetModules();
    vi.doMock("../../client", () => ({ askJSON: mockAskJSON }));
    const { detectFlakyTests } = await import("../../modules/flaky-detector");
    const result = await detectFlakyTests();

    expect(result).toHaveLength(1);
    expect(result[0].classification).toBe("timing-dependent");
  });

  it("returns empty array when all tests pass consistently", async () => {
    const stableRecord = makeTestRecord({
      testId: "t1",
      status: "passed",
      duration: 1000,
      retries: 0,
    });
    const runs = Array.from({ length: 5 }, (_, i) =>
      makeRunHistory({ runId: `r${i}`, results: [stableRecord] })
    );

    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readFileSync").mockReturnValue(JSON.stringify(runs));

    const { detectFlakyTests } = await import("../../modules/flaky-detector");
    const result = await detectFlakyTests();
    expect(result).toEqual([]);
  });
});
