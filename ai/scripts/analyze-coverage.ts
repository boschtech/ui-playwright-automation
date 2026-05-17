#!/usr/bin/env tsx
/**
 * Analyze test coverage gaps in the E2E suite.
 *
 * Usage:
 *   npx tsx ai/scripts/analyze-coverage.ts          # human-readable
 *   npx tsx ai/scripts/analyze-coverage.ts --json   # raw JSON
 */
import { analyzeCoverageGaps } from "../modules/coverage-analyzer";

async function main() {
  const outputJson = process.argv.includes("--json");

  console.log("🔎 Analyzing test coverage gaps...\n");
  const gaps = await analyzeCoverageGaps();

  if (gaps.length === 0) {
    console.log("✅ No coverage gaps identified.");
    return;
  }

  if (outputJson) {
    console.log(JSON.stringify(gaps, null, 2));
    return;
  }

  const priorityEmoji = { high: "🔴", medium: "🟡", low: "🟢" };

  console.log(`Found ${gaps.length} coverage gap(s):\n`);

  for (const gap of gaps) {
    console.log(
      `${priorityEmoji[gap.priority] ?? "⚪"} [${gap.priority.toUpperCase()}] ${gap.feature}`
    );
    console.log(`   ${gap.description}`);
    console.log(`   Suggested test: ${gap.suggestedTest}`);
    console.log();
  }

  const summary = {
    high: gaps.filter((g) => g.priority === "high").length,
    medium: gaps.filter((g) => g.priority === "medium").length,
    low: gaps.filter((g) => g.priority === "low").length,
  };
  console.log("📊 Summary:", JSON.stringify(summary));
}

main().catch((err) => {
  console.error("❌ Error:", err.message ?? err);
  process.exit(1);
});
