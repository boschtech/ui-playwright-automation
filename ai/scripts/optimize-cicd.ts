#!/usr/bin/env tsx
/**
 * Analyze CI/CD pipeline and produce optimization recommendations.
 *
 * Usage:
 *   npx tsx ai/scripts/optimize-cicd.ts          # human-readable
 *   npx tsx ai/scripts/optimize-cicd.ts --json   # raw JSON
 */
import { optimizeCICD } from "../modules/cicd-optimizer";

async function main() {
  const outputJson = process.argv.includes("--json");

  console.log("⚙️  Analyzing CI/CD pipeline...\n");
  const recommendations = await optimizeCICD();

  if (recommendations.length === 0) {
    console.log("✅ No optimization recommendations.");
    return;
  }

  if (outputJson) {
    console.log(JSON.stringify(recommendations, null, 2));
    return;
  }

  console.log(`Found ${recommendations.length} optimization(s):\n`);

  const impactEmoji = { high: "🔴", medium: "🟡", low: "🟢" };

  for (const r of recommendations) {
    console.log(`${impactEmoji[r.impact] ?? "⚪"} [${r.impact.toUpperCase()}] ${r.area}`);
    console.log(`   Current: ${r.current}`);
    console.log(`   Suggestion: ${r.suggestion}`);
    console.log();
  }
}

main().catch((err) => {
  console.error("❌ Error:", err.message ?? err);
  process.exit(1);
});
