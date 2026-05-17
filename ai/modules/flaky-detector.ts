import fs from "node:fs";
import { askJSON } from "../client";
import { aiConfig } from "../config";
import type { RunHistory, FlakyTestEntry } from "../types";

/**
 * Analyze test history for flaky patterns.
 * Performs statistical analysis first, then sends borderline cases to Claude.
 */
export async function detectFlakyTests(): Promise<FlakyTestEntry[]> {
  if (!fs.existsSync(aiConfig.paths.history)) {
    console.log("No test history found. Run tests first to build history.");
    return [];
  }

  const history: RunHistory[] = JSON.parse(
    fs.readFileSync(aiConfig.paths.history, "utf-8")
  );

  // Take only the last N runs
  const recentRuns = history.slice(-aiConfig.flakyHistoryWindow);
  if (recentRuns.length < 3) {
    console.log(
      `Only ${recentRuns.length} run(s) in history. Need at least 3 for flaky detection.`
    );
    return [];
  }

  // ── Statistical analysis ──
  const testStats = aggregateStats(recentRuns);
  const candidates: Array<{
    testId: string;
    title: string;
    file: string;
    passRate: number;
    totalRuns: number;
    avgDuration: number;
    durationVariance: number;
  }> = [];

  for (const [testId, stats] of Object.entries(testStats)) {
    const passRate = stats.passed / stats.total;
    const avgDuration =
      stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length;
    const variance = computeVariance(stats.durations, avgDuration);

    // A test is a flaky candidate if:
    // - pass rate < 100% (has failed at least once)
    // - OR duration variance is very high (> 50% of mean)
    // - OR it has retries
    if (passRate < 1.0 || variance > avgDuration * 0.5 || stats.retries > 0) {
      candidates.push({
        testId,
        title: stats.title,
        file: stats.file,
        passRate,
        totalRuns: stats.total,
        avgDuration,
        durationVariance: variance,
      });
    }
  }

  if (candidates.length === 0) {
    console.log("No flaky test candidates detected.");
    return [];
  }

  // ── Claude classification ──
  const systemPrompt = `You are a test reliability engineer analyzing flaky test patterns.

For each candidate, classify it and provide a recommendation.

Classifications:
- "timing-dependent": Test relies on animations, timeouts, or network timing
- "data-dependent": Test depends on specific data state that varies between runs
- "race-condition": Test has a concurrency issue with the application
- "selector-fragile": Test uses brittle selectors that break intermittently
- "environment-sensitive": Test is sensitive to CI runner resources or network
- "false-positive": Test is not actually flaky (legitimate failures)

Return a JSON array:
[{
  "testId": "...",
  "title": "...",
  "file": "...",
  "passRate": 0.0-1.0,
  "totalRuns": N,
  "avgDuration": N,
  "durationVariance": N,
  "classification": "one of the above",
  "recommendation": "Specific fix suggestion"
}]`;

  const userPrompt = `## Flaky Test Candidates (last ${recentRuns.length} runs)
${JSON.stringify(candidates, null, 2)}`;

  return askJSON<FlakyTestEntry[]>(systemPrompt, userPrompt);
}

interface TestStats {
  title: string;
  file: string;
  passed: number;
  failed: number;
  total: number;
  retries: number;
  durations: number[];
}

function aggregateStats(runs: RunHistory[]): Record<string, TestStats> {
  const stats: Record<string, TestStats> = {};

  for (const run of runs) {
    for (const result of run.results) {
      if (!stats[result.testId]) {
        stats[result.testId] = {
          title: result.title,
          file: result.file,
          passed: 0,
          failed: 0,
          total: 0,
          retries: 0,
          durations: [],
        };
      }
      const s = stats[result.testId];
      s.total++;
      if (result.status === "passed") s.passed++;
      else s.failed++;
      s.retries += result.retries;
      s.durations.push(result.duration);
    }
  }

  return stats;
}

function computeVariance(values: number[], mean: number): number {
  if (values.length < 2) return 0;
  const sumSquares = values.reduce((acc, v) => acc + (v - mean) ** 2, 0);
  return Math.sqrt(sumSquares / (values.length - 1));
}
