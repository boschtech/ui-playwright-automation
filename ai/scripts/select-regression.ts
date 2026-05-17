#!/usr/bin/env tsx
/**
 * Determine which tests to run based on git changes.
 *
 * Usage:
 *   npx tsx ai/scripts/select-regression.ts                    # diff against main
 *   npx tsx ai/scripts/select-regression.ts --base develop     # diff against develop
 *   npx tsx ai/scripts/select-regression.ts --output-args      # output Playwright CLI args
 */
import {
  selectRegressionTests,
  toPlaywrightArgs,
} from "../modules/regression-selector";

async function main() {
  const args = process.argv.slice(2);
  const baseIdx = args.indexOf("--base");
  const baseBranch = baseIdx !== -1 && args[baseIdx + 1] ? args[baseIdx + 1] : "main";
  const outputArgs = args.includes("--output-args");

  console.log(`🔍 Analyzing changes against ${baseBranch}...\n`);
  const selection = await selectRegressionTests(baseBranch);

  if (outputArgs) {
    // Machine-readable output for CI integration
    const pwArgs = toPlaywrightArgs(selection);
    console.log(pwArgs.join(" "));
    return;
  }

  // Human-readable output
  console.log(`📋 Regression Selection:`);
  console.log(`   Run all: ${selection.runAll}`);
  console.log(`   Files: ${selection.files.join(", ") || "(none)"}`);
  console.log(`   Grep: ${selection.grepPatterns.join(", ") || "(none)"}`);
  console.log(`   Reasoning: ${selection.reasoning}`);

  if (selection.runAll) {
    console.log("\n⚡ Recommendation: Run the full test suite.");
  } else if (selection.files.length === 0 && selection.grepPatterns.length === 0) {
    console.log("\n✅ No tests needed for these changes.");
  } else {
    const pwArgs = toPlaywrightArgs(selection);
    console.log(`\n🚀 Suggested command: npx playwright test ${pwArgs.join(" ")}`);
  }
}

main().catch((err) => {
  console.error("❌ Error:", err.message ?? err);
  process.exit(1);
});
