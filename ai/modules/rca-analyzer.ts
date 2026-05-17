import fs from "node:fs";
import path from "node:path";
import { askJSON } from "../client";
import { aiConfig } from "../config";
import type { TestRecord, RCAResult } from "../types";

/**
 * Analyze test failures and produce root-cause explanations.
 * Reads failures from `ai/history/last-failures.json` (written by AI reporter).
 */
export async function analyzeFailures(
  failures?: TestRecord[]
): Promise<RCAResult[]> {
  if (!failures) {
    const failurePath = aiConfig.paths.failureReport;
    if (!fs.existsSync(failurePath)) return [];
    failures = JSON.parse(fs.readFileSync(failurePath, "utf-8"));
  }

  if (!failures || failures.length === 0) return [];

  const results: RCAResult[] = [];

  for (const failure of failures) {
    const rca = await analyzeOne(failure);
    results.push(rca);
  }

  return results;
}

async function analyzeOne(failure: TestRecord): Promise<RCAResult> {
  // Gather relevant source code for context
  const specSource = readFileIfExists(
    path.resolve(process.cwd(), failure.file)
  );
  const pageObjectSource = findRelatedPageObject(failure.file);

  const systemPrompt = `You are a test failure analyst for a Playwright E2E suite.
Analyze the failure and determine its root cause.

Categories:
- BUG: A genuine application defect (broken feature, API error, wrong behavior)
- FLAKY: An intermittent issue (timing, race condition, animation, network)
- ENVIRONMENT: Infrastructure problem (service down, DNS, Docker, CI runner)
- TEST_ISSUE: Problem in the test itself (wrong selector, stale assertion, bad test data)

Return JSON:
{
  "testId": "the test ID",
  "title": "test title",
  "file": "file path",
  "category": "BUG|FLAKY|ENVIRONMENT|TEST_ISSUE",
  "rootCause": "One-paragraph explanation of the root cause",
  "suggestedFix": "Specific action to fix the issue",
  "confidence": 0.0-1.0
}`;

  const userPrompt = `## Failed Test
- **Title:** ${failure.title}
- **File:** ${failure.file}
- **Suite:** ${failure.suite}
- **Duration:** ${failure.duration}ms
- **Retries:** ${failure.retries}

## Error
\`\`\`
${failure.error ?? "No error message captured"}
\`\`\`

## Test Source
\`\`\`typescript
${specSource ?? "Source not available"}
\`\`\`

## Page Object Source
\`\`\`typescript
${pageObjectSource ?? "Not found"}
\`\`\`

${failure.screenshotPath ? `Screenshot saved at: ${failure.screenshotPath}` : "No screenshot available."}
${failure.tracePath ? `Trace saved at: ${failure.tracePath}` : "No trace available."}`;

  return askJSON<RCAResult>(systemPrompt, userPrompt);
}

function readFileIfExists(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}

function findRelatedPageObject(specFile: string): string | null {
  const specPath = path.resolve(process.cwd(), specFile);
  const specContent = readFileIfExists(specPath);
  if (!specContent) return null;

  // Extract page object imports
  const imports = [...specContent.matchAll(/from\s+["'](.+?\.page)["']/g)];
  const pageFiles: string[] = [];

  for (const match of imports) {
    const importPath = match[1];
    const resolved = path.resolve(path.dirname(specPath), importPath + ".ts");
    const content = readFileIfExists(resolved);
    if (content) pageFiles.push(`// ${path.basename(resolved)}\n${content}`);
  }

  return pageFiles.join("\n\n") || null;
}
