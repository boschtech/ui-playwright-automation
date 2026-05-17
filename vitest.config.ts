import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["ai/__tests__/**/*.test.ts"],
    environment: "node",
    testTimeout: 10_000,
    // Use forks pool (separate OS processes) instead of the default threads
    // pool. The threads pool shares module registry state between test files
    // running in the same worker — vi.mock() calls in one file (e.g.
    // rca-analyzer.test.ts mocks '../../client') can bleed into another
    // (client.test.ts) because they resolve to the same absolute module path.
    // Forks give each file a fully isolated Node.js process so mocks never
    // leak across test files.
    pool: "forks",
  },
});