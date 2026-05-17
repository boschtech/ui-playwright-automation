import { describe, it, expect, vi, beforeEach } from "vitest";

const MOCK_GENERATED_CODE = `import { test, expect } from "@playwright/test";

test("generated test", async ({ page }) => {
  await page.goto("/");
});`;

vi.mock("../../client", () => ({
  ask: vi.fn().mockResolvedValue(MOCK_GENERATED_CODE),
}));

describe("test-generator", () => {
  beforeEach(async () => {
    const { ask } = await import("../../client");
    (ask as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_GENERATED_CODE);
  });

  it("generates a spec with AI-GENERATED marker", async () => {
    const { generateTests } = await import("../../modules/test-generator");
    const result = await generateTests("User can filter products by category");

    expect(result).toContain("AI-GENERATED");
    expect(result).toContain("User can filter products by category");
    expect(result).toContain("Generated:");
  });

  it("includes the generated code from Claude", async () => {
    const { generateTests } = await import("../../modules/test-generator");
    const result = await generateTests("Simple requirement");

    expect(result).toContain("generated test");
    expect(result).toContain("@playwright/test");
  });

  it("truncates long requirements in the header", async () => {
    const longReq = "A".repeat(200);
    const { generateTests } = await import("../../modules/test-generator");
    const result = await generateTests(longReq);

    // Header should contain truncated requirement (max 100 chars)
    const header = result.split("\n")[1]; // second line
    expect(header.length).toBeLessThan(200);
  });

  it("passes requirement to Claude via ask()", async () => {
    const { ask } = await import("../../client");
    const { generateTests } = await import("../../modules/test-generator");
    await generateTests("Test search feature");

    expect(ask).toHaveBeenCalledWith(
      expect.stringContaining("Playwright"),
      expect.stringContaining("Test search feature"),
      expect.objectContaining({ maxTokens: 8192 })
    );
  });
});
