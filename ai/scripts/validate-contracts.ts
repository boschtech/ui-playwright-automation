#!/usr/bin/env tsx
/**
 * Validate API contracts from captured request/response pairs.
 *
 * Usage:
 *   npx tsx ai/scripts/validate-contracts.ts          # human-readable
 *   npx tsx ai/scripts/validate-contracts.ts --json   # raw JSON
 */
import { validateContracts } from "../modules/contract-validator";

async function main() {
  const outputJson = process.argv.includes("--json");

  console.log("📋 Validating API contracts...\n");
  const violations = await validateContracts();

  if (violations.length === 0) {
    console.log("✅ No contract violations found.");
    return;
  }

  if (outputJson) {
    console.log(JSON.stringify(violations, null, 2));
    return;
  }

  const severityEmoji = { error: "🔴", warning: "🟡", info: "ℹ️" };

  console.log(`Found ${violations.length} contract violation(s):\n`);

  for (const v of violations) {
    console.log(
      `${severityEmoji[v.severity] ?? "⚪"} [${v.severity.toUpperCase()}] ${v.method} ${v.endpoint}`
    );
    console.log(`   Issue: ${v.issue}`);
    console.log(`   Details: ${v.details}`);
    console.log();
  }

  const summary = {
    errors: violations.filter((v) => v.severity === "error").length,
    warnings: violations.filter((v) => v.severity === "warning").length,
    info: violations.filter((v) => v.severity === "info").length,
  };
  console.log("📊 Summary:", JSON.stringify(summary));

  // Exit with non-zero if there are errors
  if (summary.errors > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌ Error:", err.message ?? err);
  process.exit(1);
});
