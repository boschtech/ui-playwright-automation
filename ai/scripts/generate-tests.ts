#!/usr/bin/env tsx
/**
 * Generate Playwright test specs from requirements using AI.
 *
 * Usage:
 *   npx tsx ai/scripts/generate-tests.ts --requirement "As a user I can filter products by category"
 *   npx tsx ai/scripts/generate-tests.ts --file requirements.txt
 *   echo "User can sort orders" | npx tsx ai/scripts/generate-tests.ts
 */
import fs from "node:fs";
import path from "node:path";
import { generateTests } from "../modules/test-generator";
import { aiConfig } from "../config";

async function main() {
  const args = process.argv.slice(2);
  let requirement = "";

  // Parse args
  const reqIdx = args.indexOf("--requirement");
  const fileIdx = args.indexOf("--file");
  const outIdx = args.indexOf("--output");

  if (reqIdx !== -1 && args[reqIdx + 1]) {
    requirement = args[reqIdx + 1];
  } else if (fileIdx !== -1 && args[fileIdx + 1]) {
    requirement = fs.readFileSync(args[fileIdx + 1], "utf-8");
  } else if (!process.stdin.isTTY) {
    // Read from stdin
    requirement = await readStdin();
  }

  if (!requirement.trim()) {
    console.error(
      "Usage: generate-tests --requirement <text> | --file <path> | pipe via stdin"
    );
    process.exit(1);
  }

  console.log("🤖 Generating tests from requirement...\n");
  const generated = await generateTests(requirement);

  // Determine output path
  let outputPath: string;
  if (outIdx !== -1 && args[outIdx + 1]) {
    outputPath = args[outIdx + 1];
  } else {
    const slug = requirement
      .slice(0, 40)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    outputPath = path.join(aiConfig.paths.e2eTests, `${slug}.spec.ts`);
  }

  fs.writeFileSync(outputPath, generated);
  console.log(`✅ Generated test written to: ${outputPath}`);
  console.log("\n⚠️  Review the generated file before committing.");
}

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
  });
}

main().catch((err) => {
  console.error("❌ Error:", err.message ?? err);
  process.exit(1);
});
