import { describe, it, expect, vi } from "vitest";

const mockGaps = [
  {
    feature: "Negative product creation",
    description: "No tests for invalid product inputs",
    priority: "high" as const,
    suggestedTest: "Submit form with empty name, verify error message",
  },
  {
    feature: "Order cancellation",
    description: "Missing cancel order flow",
    priority: "medium" as const,
    suggestedTest: "Cancel a confirmed order, verify status changes",
  },
];

vi.mock("../../client", () => ({
  askJSON: vi.fn().mockResolvedValue(mockGaps),
}));

describe("coverage-analyzer", () => {
  it("returns coverage gaps from Claude analysis", async () => {
    const { analyzeCoverageGaps } = await import(
      "../../modules/coverage-analyzer"
    );
    const result = await analyzeCoverageGaps();

    expect(result).toHaveLength(2);
    expect(result[0].priority).toBe("high");
    expect(result[1].feature).toBe("Order cancellation");
  });

  it("sends page objects and test specs to Claude", async () => {
    const { askJSON } = await import("../../client");
    const { analyzeCoverageGaps } = await import(
      "../../modules/coverage-analyzer"
    );
    await analyzeCoverageGaps();

    expect(askJSON).toHaveBeenCalledWith(
      expect.stringContaining("coverage gap"),
      expect.stringContaining("Page Objects"),
      expect.objectContaining({ maxTokens: 8192 })
    );
  });
});
