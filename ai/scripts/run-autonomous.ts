#!/usr/bin/env tsx
/**
 * Run Playwright tests autonomously with AI-driven retry and defect creation.
 *
 * Usage:
 *   npx tsx ai/scripts/run-autonomous.ts
 *   npx tsx ai/scripts/run-autonomous.ts -- --grep @product-service
 */
import { runAutonomous } from "../modules/executor";

async function main() {
  const separatorIdx = process.argv.indexOf("--");
  const extraArgs =
    separatorIdx !== -1 ? process.argv.slice(separatorIdx + 1) : [];

  const report = await runAutonomous(extraArgs);

  console.log("\n" + "═".repeat(60));
  console.log("📊 AUTONOMOUS EXECUTION REPORT");
  console.log("═".repeat(60));
  console.log(`Total runs:        ${report.totalRuns}`);
  console.log(`Initial failures:  ${report.initialFailures}`);
  console.log(`Retried tests:     ${report.retriedTests}`);
  console.log(`Final failures:    ${report.finalFailures}`);
  console.log(`Defects created:   ${report.defectsCreated}`);
  console.log("\nDecisions:");
  for (const d of report.decisions) {
    console.log(`  • ${d}`);
  }

  if (report.rcaResults.length > 0) {
    console.log("\nRCA Summary:");
    for (const r of report.rcaResults) {
      console.log(
        `  [${r.category}] ${r.title} (confidence: ${(r.confidence * 100).toFixed(0)}%)`
      );
      console.log(`    → ${r.rootCause}`);
    }
  }
  console.log("═".repeat(60));

  // Exit with non-zero if there are final failures
  if (report.finalFailures > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌ Error:", err.message ?? err);
  process.exit(1);
});
