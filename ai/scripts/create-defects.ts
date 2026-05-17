#!/usr/bin/env tsx
/**
 * Create GitHub issues from test failure RCA results.
 *
 * Usage:
 *   npx tsx ai/scripts/create-defects.ts              # analyze + create
 *   npx tsx ai/scripts/create-defects.ts --dry-run    # preview without creating
 */
import { analyzeFailures } from "../modules/rca-analyzer";
import { createDefectsFromRCA } from "../modules/defect-creator";
import { aiConfig } from "../config";

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  console.log("🔍 Analyzing failures for defect creation...\n");
  const rcaResults = await analyzeFailures();

  const bugs = rcaResults.filter(
    (r) =>
      r.category === "BUG" &&
      r.confidence >= aiConfig.defectConfidenceThreshold
  );

  if (bugs.length === 0) {
    console.log("✅ No high-confidence BUG failures found.");
    return;
  }

  console.log(`Found ${bugs.length} defect(s) to create:\n`);
  for (const b of bugs) {
    console.log(`  🐛 ${b.title} (confidence: ${(b.confidence * 100).toFixed(0)}%)`);
    console.log(`     Root cause: ${b.rootCause}`);
  }

  if (dryRun) {
    console.log("\n⏸️  Dry run — no issues created.");
    return;
  }

  console.log("\n📝 Creating GitHub issues...");
  const created = await createDefectsFromRCA(bugs);
  console.log(`\n✅ Created ${created.length} issue(s).`);
}

main().catch((err) => {
  console.error("❌ Error:", err.message ?? err);
  process.exit(1);
});
