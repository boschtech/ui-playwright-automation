import fs from "node:fs";
import { execSync } from "node:child_process";
import { askJSON } from "../client";
import { aiConfig } from "../config";
import type { RunHistory, CICDRecommendation } from "../types";

/**
 * Analyze CI/CD pipeline configuration and test execution history
 * to produce optimization recommendations.
 */
export async function optimizeCICD(): Promise<CICDRecommendation[]> {
  const ciConfig = readFileOrEmpty(aiConfig.paths.ciWorkflow);
  const playwrightConfig = readFileOrEmpty(aiConfig.paths.playwrightConfig);

  // Gather test history stats
  let historyStats = "No test history available.";
  if (fs.existsSync(aiConfig.paths.history)) {
    const history: RunHistory[] = JSON.parse(
      fs.readFileSync(aiConfig.paths.history, "utf-8")
    );
    historyStats = summarizeHistory(history);
  }

  // Try to get recent GH Actions timing
  let ghActionsData = "";
  try {
    ghActionsData = execSync(
      "gh run list --limit 10 --json databaseId,status,conclusion,createdAt,updatedAt,headBranch,name",
      { encoding: "utf-8", timeout: 15_000 }
    );
  } catch {
    ghActionsData = "GitHub CLI not available or not authenticated.";
  }

  const systemPrompt = `You are a CI/CD optimization expert for a Playwright E2E test pipeline.
Analyze the pipeline configuration, test execution patterns, and timing data.

Provide actionable recommendations in these areas:
- Parallelization / sharding strategy
- Caching improvements (browser binaries, npm, Maven, build artifacts)
- Worker count and resource allocation
- Test ordering and grouping
- Pipeline structure (job splitting, conditional execution)
- Artifact management
- Timeout and retry configuration

Return a JSON array:
[{
  "area": "Category of optimization",
  "current": "What is currently configured",
  "suggestion": "Specific change to make",
  "impact": "high|medium|low"
}]

Sort by impact (high first).`;

  const userPrompt = `## CI Workflow (.github/workflows/ci.yml)
\`\`\`yaml
${ciConfig}
\`\`\`

## Playwright Config
\`\`\`typescript
${playwrightConfig}
\`\`\`

## Test Execution History
${historyStats}

## Recent GitHub Actions Runs
\`\`\`json
${ghActionsData}
\`\`\``;

  return askJSON<CICDRecommendation[]>(systemPrompt, userPrompt, {
    maxTokens: 4096,
  });
}

function readFileOrEmpty(filePath: string): string {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return "(file not found)";
  }
}

function summarizeHistory(history: RunHistory[]): string {
  if (history.length === 0) return "No runs recorded.";

  const totalRuns = history.length;
  const allDurations = history.flatMap((r) =>
    r.results.map((t) => t.duration)
  );
  const avgTestDuration =
    allDurations.reduce((a, b) => a + b, 0) / allDurations.length;
  const totalTests = history[history.length - 1].results.length;
  const failureRuns = history.filter((r) =>
    r.results.some((t) => t.status === "failed")
  ).length;

  // Per-test average durations (top 5 slowest)
  const testDurations: Record<string, { total: number; count: number; title: string }> = {};
  for (const run of history) {
    for (const r of run.results) {
      if (!testDurations[r.testId]) {
        testDurations[r.testId] = { total: 0, count: 0, title: r.title };
      }
      testDurations[r.testId].total += r.duration;
      testDurations[r.testId].count++;
    }
  }
  const slowest = Object.entries(testDurations)
    .map(([id, d]) => ({ id, title: d.title, avg: d.total / d.count }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5);

  return `- Total runs: ${totalRuns}
- Tests per run: ${totalTests}
- Avg test duration: ${Math.round(avgTestDuration)}ms
- Runs with failures: ${failureRuns}/${totalRuns}
- Top 5 slowest tests:
${slowest.map((s) => `  - ${s.title}: ${Math.round(s.avg)}ms avg`).join("\n")}`;
}
