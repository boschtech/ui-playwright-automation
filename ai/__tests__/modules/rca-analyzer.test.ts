import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import { makeFailedRecord, makeRCAResult } from "../helpers";

vi.mock("../../client", () => ({
  askJSON: vi.fn(),
}));

describe("rca-analyzer", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty array when no failure report exists", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    const { analyzeFailures } = await import("../../modules/rca-analyzer");
    const result = await analyzeFailures();
    expect(result).toEqual([]);
  });

  it("returns empty array when failures list is empty", async () => {
    const { analyzeFailures } = await import("../../modules/rca-analyzer");
    const result = await analyzeFailures([]);
    expect(result).toEqual([]);
  });

  it("analyzes each failure and returns RCA results", async () => {
    const failure = makeFailedRecord({ testId: "t1", title: "broken test" });
    const expectedRCA = makeRCAResult({
      testId: "t1",
      title: "broken test",
      category: "BUG",
      confidence: 0.85,
    });

    const { askJSON } = await import("../../client");
    (askJSON as ReturnType<typeof vi.fn>).mockResolvedValue(expectedRCA);

    const { analyzeFailures } = await import("../../modules/rca-analyzer");
    const results = await analyzeFailures([failure]);

    expect(results).toHaveLength(1);
    expect(results[0].category).toBe("BUG");
    expect(results[0].confidence).toBe(0.85);
    expect(askJSON).toHaveBeenCalledOnce();
  });

  it("handles multiple failures sequentially", async () => {
    const failures = [
      makeFailedRecord({ testId: "t1", title: "fail one" }),
      makeFailedRecord({ testId: "t2", title: "fail two" }),
    ];

    const { askJSON } = await import("../../client");
    (askJSON as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(makeRCAResult({ testId: "t1", category: "BUG" }))
      .mockResolvedValueOnce(
        makeRCAResult({ testId: "t2", category: "FLAKY" })
      );

    const { analyzeFailures } = await import("../../modules/rca-analyzer");
    const results = await analyzeFailures(failures);

    expect(results).toHaveLength(2);
    expect(results[0].category).toBe("BUG");
    expect(results[1].category).toBe("FLAKY");
  });

  it("reads failures from file when none provided", async () => {
    const failures = [makeFailedRecord()];
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readFileSync").mockReturnValue(JSON.stringify(failures));

    const { askJSON } = await import("../../client");
    (askJSON as ReturnType<typeof vi.fn>).mockResolvedValue(makeRCAResult());

    const { analyzeFailures } = await import("../../modules/rca-analyzer");
    const results = await analyzeFailures();

    expect(results).toHaveLength(1);
  });
});
