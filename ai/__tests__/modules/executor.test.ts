import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeRCAResult } from "../helpers";

vi.mock("../../modules/rca-analyzer", () => ({
  analyzeFailures: vi.fn(),
}));

vi.mock("../../modules/defect-creator", () => ({
  createDefectsFromRCA: vi.fn().mockResolvedValue([]),
}));

vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
}));

describe("executor", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns success report when all tests pass on first run", async () => {
    const { execSync } = await import("node:child_process");
    (execSync as ReturnType<typeof vi.fn>).mockReturnValue("");

    const { runAutonomous } = await import("../../modules/executor");
    const report = await runAutonomous();

    expect(report.totalRuns).toBe(1);
    expect(report.initialFailures).toBe(0);
    expect(report.finalFailures).toBe(0);
    expect(report.decisions).toContain(
      "All tests passed on first run. No further action."
    );
  });

  it("retries transient failures after first run fails", async () => {
    const { execSync } = await import("node:child_process");
    const mockExec = execSync as ReturnType<typeof vi.fn>;

    // First run: fails
    mockExec.mockImplementationOnce(() => {
      throw new Error("tests failed");
    });
    // Retry run: passes
    mockExec.mockReturnValueOnce("");

    const { analyzeFailures } = await import("../../modules/rca-analyzer");
    (analyzeFailures as ReturnType<typeof vi.fn>).mockResolvedValue([
      makeRCAResult({ category: "FLAKY", title: "flaky test" }),
    ]);

    const { runAutonomous } = await import("../../modules/executor");
    const report = await runAutonomous();

    expect(report.totalRuns).toBe(2);
    expect(report.retriedTests).toBe(1);
    expect(report.decisions).toContainEqual(
      expect.stringContaining("Retrying 1 test(s)")
    );
    expect(report.decisions).toContain(
      "All transient failures passed on retry."
    );
  });

  it("creates defects for BUG failures without retry", async () => {
    const { execSync } = await import("node:child_process");
    (execSync as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error("tests failed");
    });

    const { analyzeFailures } = await import("../../modules/rca-analyzer");
    (analyzeFailures as ReturnType<typeof vi.fn>).mockResolvedValue([
      makeRCAResult({ category: "BUG", title: "real bug" }),
    ]);

    const { createDefectsFromRCA } = await import(
      "../../modules/defect-creator"
    );
    (createDefectsFromRCA as ReturnType<typeof vi.fn>).mockResolvedValue([
      { title: "[E2E] real bug", body: "...", labels: ["bug"] },
    ]);

    const { runAutonomous } = await import("../../modules/executor");
    const report = await runAutonomous();

    expect(report.totalRuns).toBe(1); // no retry for BUGs
    expect(report.finalFailures).toBe(1);
    expect(report.defectsCreated).toBe(1);
    expect(report.decisions).toContainEqual(
      expect.stringContaining("BUG")
    );
  });

  it("counts TEST_ISSUE as final failures", async () => {
    const { execSync } = await import("node:child_process");
    (execSync as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error("tests failed");
    });

    const { analyzeFailures } = await import("../../modules/rca-analyzer");
    (analyzeFailures as ReturnType<typeof vi.fn>).mockResolvedValue([
      makeRCAResult({ category: "TEST_ISSUE" }),
    ]);

    const { runAutonomous } = await import("../../modules/executor");
    const report = await runAutonomous();

    expect(report.finalFailures).toBe(1);
    expect(report.decisions).toContainEqual(
      expect.stringContaining("TEST_ISSUE")
    );
  });
});
