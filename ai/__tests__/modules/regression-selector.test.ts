import { describe, it, expect, vi } from "vitest";
import { toPlaywrightArgs } from "../../modules/regression-selector";

describe("regression-selector", () => {
  describe("toPlaywrightArgs", () => {
    it("returns empty array when runAll is true", () => {
      const result = toPlaywrightArgs({
        files: ["e2e/tests/products.spec.ts"],
        grepPatterns: ["@product-service"],
        reasoning: "infra change",
        runAll: true,
      });
      expect(result).toEqual([]);
    });

    it("returns empty array when no files selected", () => {
      const result = toPlaywrightArgs({
        files: [],
        grepPatterns: [],
        reasoning: "no changes",
        runAll: false,
      });
      expect(result).toEqual([]);
    });

    it("returns --grep args when grep patterns are provided", () => {
      const result = toPlaywrightArgs({
        files: ["e2e/tests/products.spec.ts"],
        grepPatterns: ["@product-service", "@order-service"],
        reasoning: "both services changed",
        runAll: false,
      });
      expect(result).toEqual(["--grep", "@product-service|@order-service"]);
    });

    it("returns file paths when no grep patterns provided", () => {
      const result = toPlaywrightArgs({
        files: ["e2e/tests/products.spec.ts", "e2e/tests/orders.spec.ts"],
        grepPatterns: [],
        reasoning: "specific files changed",
        runAll: false,
      });
      expect(result).toEqual([
        "e2e/tests/products.spec.ts",
        "e2e/tests/orders.spec.ts",
      ]);
    });

    it("prefers grep patterns over file list", () => {
      const result = toPlaywrightArgs({
        files: ["e2e/tests/products.spec.ts"],
        grepPatterns: ["@product-service"],
        reasoning: "product changes",
        runAll: false,
      });
      expect(result).toEqual(["--grep", "@product-service"]);
    });
  });

  describe("selectRegressionTests", () => {
    it("returns empty selection when no git diff", async () => {
      vi.mock("node:child_process", () => ({
        execSync: vi.fn(() => ""),
      }));
      vi.resetModules();

      const { selectRegressionTests } = await import(
        "../../modules/regression-selector"
      );
      const result = await selectRegressionTests("main");
      expect(result.runAll).toBe(false);
      expect(result.files).toEqual([]);
      expect(result.reasoning).toContain("No changes");
    });
  });
});
