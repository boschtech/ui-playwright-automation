import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeRCAResult } from "../helpers";

vi.mock("../../client", () => ({
  ask: vi.fn(),
}));

vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
}));

describe("defect-creator", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { ask } = await import("../../client");
    (ask as ReturnType<typeof vi.fn>).mockResolvedValue(
      "## Summary\nTest failure details..."
    );
  });

  it("returns empty array when no BUG results provided", async () => {
    const { createDefectsFromRCA } = await import(
      "../../modules/defect-creator"
    );
    const result = await createDefectsFromRCA([
      makeRCAResult({ category: "FLAKY" }),
    ]);
    expect(result).toEqual([]);
  });

  it("skips low-confidence bugs", async () => {
    const { createDefectsFromRCA } = await import(
      "../../modules/defect-creator"
    );
    const result = await createDefectsFromRCA([
      makeRCAResult({ category: "BUG", confidence: 0.3 }),
    ]);
    expect(result).toEqual([]);
  });

  it("creates issue for high-confidence BUG via gh CLI", async () => {
    const { execSync } = await import("node:child_process");
    const mockExec = execSync as ReturnType<typeof vi.fn>;

    // First call: isDuplicate check returns empty array
    mockExec.mockReturnValueOnce("[]");
    // Second call: gh issue create
    mockExec.mockReturnValueOnce("https://github.com/org/repo/issues/42");

    const { createDefectsFromRCA } = await import(
      "../../modules/defect-creator"
    );
    const result = await createDefectsFromRCA([
      makeRCAResult({ category: "BUG", confidence: 0.9 }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].title).toContain("[E2E Failure]");
    expect(result[0].labels).toContain("bug");
    expect(result[0].labels).toContain("e2e-failure");
  });

  it("skips duplicate issues", async () => {
    const { execSync } = await import("node:child_process");
    const mockExec = execSync as ReturnType<typeof vi.fn>;

    // isDuplicate returns matching issue
    mockExec.mockReturnValueOnce(
      JSON.stringify([{ title: "[E2E Failure] should display products" }])
    );

    const { createDefectsFromRCA } = await import(
      "../../modules/defect-creator"
    );
    const result = await createDefectsFromRCA([
      makeRCAResult({ category: "BUG", confidence: 0.9 }),
    ]);

    expect(result).toEqual([]);
  });

  it("assigns product-team for product-service failures", async () => {
    const { execSync } = await import("node:child_process");
    const mockExec = execSync as ReturnType<typeof vi.fn>;
    mockExec.mockReturnValueOnce("[]"); // no duplicate
    mockExec.mockReturnValueOnce(""); // issue created

    const { createDefectsFromRCA } = await import(
      "../../modules/defect-creator"
    );
    const result = await createDefectsFromRCA([
      makeRCAResult({
        category: "BUG",
        confidence: 0.9,
        title: "should display products @product-service",
        file: "e2e/tests/products.spec.ts",
      }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].labels).toContain("product-service");
    expect(result[0].assignee).toBe("product-team");
  });
});
