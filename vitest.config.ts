import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["ai/__tests__/**/*.test.ts"],
    environment: "node",
    testTimeout: 10_000,
  },
});
