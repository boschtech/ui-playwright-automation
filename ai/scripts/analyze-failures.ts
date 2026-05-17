#!/usr/bin/env tsx
/**
 * Analyze test failures and produce root-cause explanations.
 *
 * Usage:
 *   npx tsx ai/scripts/analyze-failures.ts              # reads last-failures.json
 *   npx tsx ai/scripts/analyze-failures.ts --json       # output raw JSON
 */
import { analyzeFailures } from "../modules/rca-analyzer";

async function main() {
  const outputJson = process.argv.includes("--json");

  console.log("🔍 Analyzing test failures...\n");
  const results = await analyzeFailures();

  if (results.length === 0) {
    console.log("✅ No failures to analyze.");
    return;
  }

  if (outputJson) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  for (const r of results) {
    const emoji =
      r.category === "BUG"
        ? "🐛"
        : r.category === "FLAKY"
          ? "🎲"
          : r.category === "ENVIRONMENT"
            ? "🌐"
            : "🧪";

    console.log(`${emoji} [${r.category}] ${r.title}`);
    console.log(`   File: ${r.file}`);
    console.log(`   Confidence: ${(r.confidence * 100).toFixed(0)}%`);
    console.log(`   Root Cause: ${r.rootCause}`);
    console.log(`   Suggested Fix: ${r.suggestedFix}`);
    console.log();
  }

  const summary = {
    BUG: results.filter((r) => r.category === "BUG").length,
    FLAKY: results.filter((r) => r.category === "FLAKY").length,
    ENVIRONMENT: results.filter((r) => r.category === "ENVIRONMENT").length,
    TEST_ISSUE: results.filter((r) => r.category === "TEST_ISSUE").length,
  };
  console.log("📊 Summary:", JSON.stringify(summary));
}

main().catch((err) => {
  console.error("❌ Error:", err.message ?? err);
  process.exit(1);
});
