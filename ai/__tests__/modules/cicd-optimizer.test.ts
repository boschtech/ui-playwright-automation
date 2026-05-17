import { describe, it, expect, vi } from "vitest";

const mockRecommendations = [
  {
    area: "Caching",
    current: "No Playwright browser cache",
    suggestion: "Cache ~/.cache/ms-playwright between runs",
    impact: "high" as const,
  },
];

vi.mock("../../client", () => ({
  askJSON: vi.fn().mockResolvedValue(mockRecommendations),
}));

vi.mock("node:child_process", () => ({
  execSync: vi.fn(() => {
    throw new Error("gh not available");
  }),
}));

describe("cicd-optimizer", () => {
  it("returns recommendations from Claude", async () => {
    const { optimizeCICD } = await import("../../modules/cicd-optimizer");
    const result = await optimizeCICD();

    expect(result).toHaveLength(1);
    expect(result[0].area).toBe("Caching");
    expect(result[0].impact).toBe("high");
  });

  it("sends CI config and playwright config to Claude", async () => {
    const { askJSON } = await import("../../client");
    const { optimizeCICD } = await import("../../modules/cicd-optimizer");
    await optimizeCICD();

    expect(askJSON).toHaveBeenCalledWith(
      expect.stringContaining("CI/CD optimization"),
      expect.stringContaining("CI Workflow"),
      expect.any(Object)
    );
  });

  it("handles gh CLI not being available", async () => {
    const { optimizeCICD } = await import("../../modules/cicd-optimizer");
    // Should not throw even though execSync throws
    const result = await optimizeCICD();
    expect(Array.isArray(result)).toBe(true);
  });
});
