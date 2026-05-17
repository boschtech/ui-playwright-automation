import { describe, it, expect, vi, beforeEach } from "vitest";

describe("config", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("has the expected model configured", async () => {
    const { aiConfig } = await import("../config");
    expect(aiConfig.model).toBe("claude-sonnet-4-5-20250929");
  });

  it("is enabled by default", async () => {
    delete process.env.AI_FEATURES_ENABLED;
    const { aiConfig } = await import("../config");
    expect(aiConfig.enabled).toBe(true);
  });

  it("can be disabled via AI_FEATURES_ENABLED=false", async () => {
    process.env.AI_FEATURES_ENABLED = "false";
    const { aiConfig } = await import("../config");
    expect(aiConfig.enabled).toBe(false);
    delete process.env.AI_FEATURES_ENABLED;
  });

  it("has correct defect confidence threshold", async () => {
    const { aiConfig } = await import("../config");
    expect(aiConfig.defectConfidenceThreshold).toBe(0.7);
  });

  it("has correct flaky history window", async () => {
    const { aiConfig } = await import("../config");
    expect(aiConfig.flakyHistoryWindow).toBe(20);
  });

  it("has all required paths defined", async () => {
    const { aiConfig } = await import("../config");
    expect(aiConfig.paths.history).toContain("test-history.json");
    expect(aiConfig.paths.failureReport).toContain("last-failures.json");
    expect(aiConfig.paths.apiCaptures).toContain("api-captures.json");
    expect(aiConfig.paths.contracts).toContain("contracts");
    expect(aiConfig.paths.e2eTests).toContain("e2e/tests");
    expect(aiConfig.paths.e2ePages).toContain("e2e/pages");
  });

  it("has team mapping for both services", async () => {
    const { aiConfig } = await import("../config");
    expect(aiConfig.teamMapping["@product-service"]).toBe("product-team");
    expect(aiConfig.teamMapping["@order-service"]).toBe("order-team");
  });
});
