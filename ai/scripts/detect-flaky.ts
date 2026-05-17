#!/usr/bin/env tsx
/**
 * Detect and classify flaky tests from test execution history.
 *
 * Usage:
 *   npx tsx ai/scripts/detect-flaky.ts          # human-readable output
 *   npx tsx ai/scripts/detect-flaky.ts --json   # raw JSON output
 */
import { detectFlakyTests } from "../modules/flaky-detector";

async function main() {
  const outputJson = process.argv.includes("--json");

  console.log("🎲 Analyzing test history for flaky patterns...\n");
  const results = await detectFlakyTests();

  if (results.length === 0) {
    console.log("✅ No flaky tests detected.");
    return;
  }

  if (outputJson) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  console.log(`Found ${results.length} flaky test(s):\n`);

  for (const r of results) {
    const passPercent = (r.passRate * 100).toFixed(0);
    console.log(`🎲 ${r.title}`);
    console.log(`   File: ${r.file}`);
    console.log(`   Pass rate: ${passPercent}% (${r.totalRuns} runs)`);
    console.log(`   Avg duration: ${Math.round(r.avgDuration)}ms (σ=${Math.round(r.durationVariance)}ms)`);
    console.log(`   Classification: ${r.classification}`);
    console.log(`   Recommendation: ${r.recommendation}`);
    console.log();
  }
}

main().catch((err) => {
  console.error("❌ Error:", err.message ?? err);
  process.exit(1);
});
