import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import { aiConfig } from "../../config";
import { makeRunHistory, makeTestRecord, makeFailedRecord } from "../helpers";

const mockRecommendations = [
  {
    area: "Caching",
    current: "No Playwright browser cache",
    suggestion: "Cache ~/.cache/ms-playwright between runs",
    impact: "high" as const,
  },
];

vi.mock("../../client", () => ({
  askJSON: vi.fn(),
}));

vi.mock("node:child_process", () => ({
  execSync: vi.fn(() => {
    throw new Error("gh not available");
  }),
}));

describe("cicd-optimizer", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns recommendations from Claude", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    const { askJSON } = await import("../../client");
    (askJSON as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockRecommendations
    );

    const { optimizeCICD } = await import("../../modules/cicd-optimizer");
    const result = await optimizeCICD();

    expect(result).toHaveLength(1);
    expect(result[0].area).toBe("Caching");
    expect(result[0].impact).toBe("high");
  });

  it("sends CI config and playwright config to Claude", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    const { askJSON } = await import("../../client");
    (askJSON as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockRecommendations
    );

    const { optimizeCICD } = await import("../../modules/cicd-optimizer");
    await optimizeCICD();

    expect(askJSON).toHaveBeenCalledWith(
      expect.stringContaining("CI/CD optimization"),
      expect.stringContaining("CI Workflow"),
      expect.any(Object)
    );
  });

  it("handles gh CLI not being available", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    const { askJSON } = await import("../../client");
    (askJSON as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockRecommendations
    );

    const { optimizeCICD } = await import("../../modules/cicd-optimizer");
    // Should not throw even though execSync throws
    const result = await optimizeCICD();
    expect(Array.isArray(result)).toBe(true);
  });

  // TC-REQ-CICD-OPTIMIZER-01
  it("falls back to 'No test history available.' and never reads the history file when it does not exist", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    const readFileSyncSpy = vi.spyOn(fs, "readFileSync");
    const { askJSON } = await import("../../client");
    (askJSON as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockRecommendations
    );

    const { optimizeCICD } = await import("../../modules/cicd-optimizer");
    const result = await optimizeCICD();

    expect(result).toEqual(mockRecommendations);
    expect(askJSON).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining("No test history available."),
      expect.any(Object)
    );

    const historyReads = readFileSyncSpy.mock.calls.filter(
      (call) => call[0] === aiConfig.paths.history
    );
    expect(historyReads).toHaveLength(0);
  });

  // TC-REQ-CICD-OPTIMIZER-02
  it("reports 'No runs recorded.' when the history file contains an empty array", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readFileSync").mockImplementation((filePath) => {
      if (filePath === aiConfig.paths.history) return JSON.stringify([]);
      return "";
    });
    const { askJSON } = await import("../../client");
    (askJSON as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockRecommendations
    );

    const { optimizeCICD } = await import("../../modules/cicd-optimizer");
    await optimizeCICD();

    expect(askJSON).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining("No runs recorded."),
      expect.any(Object)
    );
  });

  // TC-REQ-CICD-OPTIMIZER-03
  it("computes total runs, average duration, and failure count across a multi-run history", async () => {
    const run1 = makeRunHistory({
      runId: "run-1",
      results: [
        makeTestRecord({
          testId: "t1",
          title: "loads product list",
          duration: 1000,
          status: "passed",
        }),
        makeTestRecord({
          testId: "t2",
          title: "loads order list",
          duration: 2000,
          status: "passed",
        }),
      ],
    });
    const run2 = makeRunHistory({
      runId: "run-2",
      results: [
        makeTestRecord({
          testId: "t1",
          title: "loads product list",
          duration: 3000,
          status: "passed",
        }),
        makeFailedRecord({
          testId: "t2",
          title: "loads order list",
          duration: 4000,
        }),
      ],
    });

    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readFileSync").mockImplementation((filePath) => {
      if (filePath === aiConfig.paths.history)
        return JSON.stringify([run1, run2]);
      return "";
    });
    const { askJSON } = await import("../../client");
    (askJSON as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockRecommendations
    );

    const { optimizeCICD } = await import("../../modules/cicd-optimizer");
    await optimizeCICD();

    const userPrompt = (askJSON as ReturnType<typeof vi.fn>).mock
      .calls[0][1] as string;
    expect(userPrompt).toContain("Total runs: 2");
    expect(userPrompt).toContain("Avg test duration: 2500ms");
    expect(userPrompt).toContain("Runs with failures: 1/2");
  });

  // TC-REQ-CICD-OPTIMIZER-04
  it("lists only the top 5 slowest tests in descending order", async () => {
    const run1 = makeRunHistory({
      runId: "run-1",
      results: [
        makeTestRecord({ testId: "t1", title: "test A", duration: 100 }),
        makeTestRecord({ testId: "t2", title: "test B", duration: 600 }),
        makeTestRecord({ testId: "t3", title: "test C", duration: 200 }),
        makeTestRecord({ testId: "t4", title: "test D", duration: 500 }),
        makeTestRecord({ testId: "t5", title: "test E", duration: 300 }),
        makeTestRecord({ testId: "t6", title: "test F", duration: 400 }),
      ],
    });

    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readFileSync").mockImplementation((filePath) => {
      if (filePath === aiConfig.paths.history) return JSON.stringify([run1]);
      return "";
    });
    const { askJSON } = await import("../../client");
    (askJSON as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockRecommendations
    );

    const { optimizeCICD } = await import("../../modules/cicd-optimizer");
    await optimizeCICD();

    const userPrompt = (askJSON as ReturnType<typeof vi.fn>).mock
      .calls[0][1] as string;
    expect(userPrompt).not.toContain("test A");

    const expectedOrder = [
      "  - test B: 600ms avg",
      "  - test D: 500ms avg",
      "  - test F: 400ms avg",
      "  - test E: 300ms avg",
      "  - test C: 200ms avg",
    ].join("\n");
    expect(userPrompt).toContain(expectedOrder);
  });

  // TC-REQ-CICD-OPTIMIZER-05
  it("averages a test's duration across multiple runs rather than using only the latest", async () => {
    const run1 = makeRunHistory({
      runId: "run-1",
      results: [
        makeTestRecord({
          testId: "t1",
          title: "loads product list",
          duration: 1000,
        }),
      ],
    });
    const run2 = makeRunHistory({
      runId: "run-2",
      results: [
        makeTestRecord({
          testId: "t1",
          title: "loads product list",
          duration: 3000,
        }),
      ],
    });

    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readFileSync").mockImplementation((filePath) => {
      if (filePath === aiConfig.paths.history)
        return JSON.stringify([run1, run2]);
      return "";
    });
    const { askJSON } = await import("../../client");
    (askJSON as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockRecommendations
    );

    const { optimizeCICD } = await import("../../modules/cicd-optimizer");
    await optimizeCICD();

    const userPrompt = (askJSON as ReturnType<typeof vi.fn>).mock
      .calls[0][1] as string;
    expect(userPrompt).toContain("  - loads product list: 2000ms avg");
  });

  // TC-REQ-CICD-OPTIMIZER-06
  it("substitutes a placeholder and does not throw when the CI/Playwright config files are missing", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    vi.spyOn(fs, "readFileSync").mockImplementation(() => {
      throw new Error("ENOENT: no such file");
    });
    const { askJSON } = await import("../../client");
    (askJSON as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockRecommendations
    );

    const { optimizeCICD } = await import("../../modules/cicd-optimizer");
    const result = await optimizeCICD();
    expect(Array.isArray(result)).toBe(true);

    const userPrompt = (askJSON as ReturnType<typeof vi.fn>).mock
      .calls[0][1] as string;
    expect(userPrompt).toContain("(file not found)");
  });
});
