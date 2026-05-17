import path from "node:path";

export const aiConfig = {
  /** Claude model to use for all AI features. */
  model: "claude-sonnet-4-20250514" as const,

  /** Master kill-switch: set AI_FEATURES_ENABLED=false to disable all AI steps. */
  enabled: process.env.AI_FEATURES_ENABLED !== "false",

  /** Minimum RCA confidence (0-1) required before auto-creating a defect. */
  defectConfidenceThreshold: 0.7,

  /** Number of recent runs to consider for flaky detection. */
  flakyHistoryWindow: 20,

  /** Paths used by the AI modules. */
  paths: {
    root: path.resolve(__dirname),
    history: path.resolve(__dirname, "history", "test-history.json"),
    contracts: path.resolve(__dirname, "contracts"),
    failureReport: path.resolve(__dirname, "history", "last-failures.json"),
    apiCaptures: path.resolve(__dirname, "history", "api-captures.json"),
    e2eTests: path.resolve(__dirname, "..", "e2e", "tests"),
    e2ePages: path.resolve(__dirname, "..", "e2e", "pages"),
    e2eFixtures: path.resolve(__dirname, "..", "e2e", "fixtures"),
    playwrightConfig: path.resolve(__dirname, "..", "playwright.config.ts"),
    ciWorkflow: path.resolve(
      __dirname,
      "..",
      ".github",
      "workflows",
      "ci.yml"
    ),
  },

  /** Tag-to-team mapping for defect assignment. */
  teamMapping: {
    "@product-service": "product-team",
    "@order-service": "order-team",
  } as Record<string, string>,
};
