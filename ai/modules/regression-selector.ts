import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { askJSON } from "../client";
import { aiConfig } from "../config";

interface RegressionSelection {
  /** Test files to include (relative paths). */
  files: string[];
  /** Playwright --grep patterns to use (empty = run selected files). */
  grepPatterns: string[];
  /** Human-readable reasoning. */
  reasoning: string;
  /** Whether to run ALL tests (e.g. for infrastructure changes). */
  runAll: boolean;
}

/**
 * Analyze git changes and determine which tests should run.
 * @param baseBranch - The branch to diff against (default: main).
 */
export async function selectRegressionTests(
  baseBranch = "main"
): Promise<RegressionSelection> {
  const diff = getGitDiff(baseBranch);
  if (!diff.trim()) {
    return {
      files: [],
      grepPatterns: [],
      reasoning: "No changes detected — nothing to test.",
      runAll: false,
    };
  }

  // Build a map of test files → page objects → selectors
  const testMap = buildTestMap();

  const systemPrompt = `You are a test-selection AI for a Playwright E2E suite.
Given a git diff and a map of test files to their page objects and selectors, determine which tests need to run.

Guidelines:
- If changes affect shared infrastructure (CI config, playwright.config.ts, package.json), set runAll=true
- If changes affect a page object, include all tests that import it
- If changes affect the frontend source (components, routes), match by feature area
- If changes affect a backend service, match by service tag (@product-service, @order-service)
- If changes only affect documentation or non-functional files, return empty selection
- Be conservative — it's better to run extra tests than miss a regression

Return JSON matching this schema:
{
  "files": ["e2e/tests/products.spec.ts"],
  "grepPatterns": ["@product-service"],
  "reasoning": "explanation",
  "runAll": false
}`;

  const userPrompt = `## Git diff (${baseBranch}...HEAD)
\`\`\`diff
${diff.slice(0, 10000)}
\`\`\`

## Test file map
${JSON.stringify(testMap, null, 2)}`;

  return askJSON<RegressionSelection>(systemPrompt, userPrompt);
}

/**
 * Produces the Playwright CLI arguments from a regression selection.
 */
export function toPlaywrightArgs(selection: RegressionSelection): string[] {
  if (selection.runAll || selection.files.length === 0) return [];
  const args: string[] = [];
  if (selection.grepPatterns.length > 0) {
    args.push("--grep", selection.grepPatterns.join("|"));
  } else {
    args.push(...selection.files);
  }
  return args;
}

function getGitDiff(baseBranch: string): string {
  try {
    return execSync(`git diff ${baseBranch}...HEAD --stat -p`, {
      encoding: "utf-8",
      maxBuffer: 1024 * 1024 * 5,
    });
  } catch {
    // Fallback: diff against last commit
    return execSync("git diff HEAD~1 --stat -p", {
      encoding: "utf-8",
      maxBuffer: 1024 * 1024 * 5,
    });
  }
}

function buildTestMap(): Record<
  string,
  { imports: string[]; tags: string[] }
> {
  const testsDir = aiConfig.paths.e2eTests;
  const map: Record<string, { imports: string[]; tags: string[] }> = {};

  if (!fs.existsSync(testsDir)) return map;

  for (const file of fs.readdirSync(testsDir)) {
    if (!file.endsWith(".spec.ts")) continue;
    const content = fs.readFileSync(path.join(testsDir, file), "utf-8");
    const imports = [...content.matchAll(/from\s+["'](.+?)["']/g)].map(
      (m) => m[1]
    );
    const tags = [...content.matchAll(/@[\w-]+/g)].map((m) => m[0]);
    map[`e2e/tests/${file}`] = { imports, tags };
  }

  return map;
}
